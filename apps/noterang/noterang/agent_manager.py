#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
노트랑 에이전트 매니저
- 작업 모니터링 및 타임아웃 감지
- 추가 에이전트 자동 투입
- 버그 발생 시 복구 에이전트 실행
"""
import asyncio
import json
import logging
import sys
import time
from pathlib import Path
from datetime import datetime
from typing import Optional, Callable, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum
import threading
import queue

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

logger = logging.getLogger(__name__)

# Default memory file path
_DEFAULT_MEMORY_PATH = Path("G:/내 드라이브/notebooklm/agent_memory.json")
# Factor applied to timeout thresholds after a timeout event (adaptive learning)
_TIMEOUT_GROWTH_FACTOR: float = 1.1
# Maximum retry attempts before an error is treated as terminal
_MAX_RETRIES: int = 3


class AgentStatus(Enum):
    """Lifecycle states for a managed agent."""

    IDLE = "idle"
    RUNNING = "running"
    WAITING = "waiting"
    ERROR = "error"
    COMPLETED = "completed"
    TIMEOUT = "timeout"


class AgentType(Enum):
    """Roles that an agent can fulfil within the multi-agent system."""

    MAIN = "main"           # Primary task executor
    MONITOR = "monitor"     # Observes task progress
    HELPER = "helper"       # Deployed on timeout to assist
    RECOVERY = "recovery"   # Deployed on error to attempt recovery

@dataclass
class AgentTask:
    """Represents a unit of work assigned to an agent."""

    task_id: str
    task_type: str
    params: Dict[str, Any]
    status: AgentStatus = AgentStatus.IDLE
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    result: Any = None
    error: Optional[str] = None
    retries: int = 0


@dataclass
class Agent:
    """Represents a single agent instance within the manager."""

    agent_id: str
    agent_type: AgentType
    status: AgentStatus = AgentStatus.IDLE
    current_task: Optional[AgentTask] = None
    created_at: float = field(default_factory=time.time)


class AgentMemory:
    """Persistent memory for agent performance statistics and error patterns.

    Stores task history, per-type timeout thresholds, and error recovery
    strategies in a JSON file.  Thresholds are updated adaptively after
    timeout events.
    """

    # Default timeout thresholds (seconds) per task type
    _DEFAULT_TIMEOUTS: Dict[str, int] = {
        "slides_create": 300,
        "research": 120,
        "download": 60,
    }

    def __init__(self, memory_path: Optional[Path] = None) -> None:
        """Initialize agent memory storage.

        Args:
            memory_path: Path to the JSON persistence file.
                Defaults to :data:`_DEFAULT_MEMORY_PATH`.
        """
        self.memory_path = memory_path or _DEFAULT_MEMORY_PATH
        self.memory_path.parent.mkdir(parents=True, exist_ok=True)
        self.data = self._load()

    def _load(self) -> Dict[str, Any]:
        """Load persisted data from disk, returning defaults on failure."""
        if self.memory_path.exists():
            try:
                with open(self.memory_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                logger.warning("Failed to load agent memory; using defaults.", exc_info=True)
        return {
            "tasks_history": [],
            "error_patterns": {},
            "timeout_thresholds": dict(self._DEFAULT_TIMEOUTS),
            "recovery_strategies": {},
            "performance_stats": {
                "total_tasks": 0,
                "successful_tasks": 0,
                "failed_tasks": 0,
                "avg_completion_time": {},
            },
        }

    def save(self) -> None:
        """Persist the current in-memory data to disk."""
        with open(self.memory_path, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)

    def record_task(self, task: AgentTask) -> None:
        """Record the outcome of a completed task.

        Args:
            task: The completed :class:`AgentTask` instance.
        """
        record = {
            "task_id": task.task_id,
            "task_type": task.task_type,
            "status": task.status.value,
            "duration": (task.completed_at - task.started_at) if task.completed_at and task.started_at else None,
            "error": task.error,
            "timestamp": datetime.now().isoformat()
        }
        self.data["tasks_history"].append(record)

        # 성능 통계 업데이트
        stats = self.data["performance_stats"]
        stats["total_tasks"] += 1
        if task.status == AgentStatus.COMPLETED:
            stats["successful_tasks"] += 1
        elif task.status == AgentStatus.ERROR:
            stats["failed_tasks"] += 1

        # 평균 완료 시간 업데이트
        if record["duration"] and task.task_type:
            if task.task_type not in stats["avg_completion_time"]:
                stats["avg_completion_time"][task.task_type] = []
            stats["avg_completion_time"][task.task_type].append(record["duration"])

        self.save()

    def record_error(
        self,
        error_type: str,
        error_msg: str,
        recovery_action: Optional[str] = None,
    ) -> None:
        """Record an error occurrence and optionally a recovery action taken.

        Args:
            error_type: Exception class name or descriptive category.
            error_msg: Error message text (truncated to 200 chars in storage).
            recovery_action: Description of the recovery strategy applied,
                if any.
        """
        pattern = self.data["error_patterns"].setdefault(error_type, {
            "count": 0,
            "examples": [],
            "recovery_actions": [],
        })

        pattern["count"] += 1
        pattern["examples"].append({
            "message": error_msg[:200],
            "timestamp": datetime.now().isoformat(),
        })

        if recovery_action and recovery_action not in pattern["recovery_actions"]:
            pattern["recovery_actions"].append(recovery_action)

        self.save()

    def get_timeout_threshold(self, task_type: str) -> int:
        """Return the current timeout threshold for *task_type*.

        Args:
            task_type: The task type key (e.g. ``"slides_create"``).

        Returns:
            Threshold in seconds; defaults to 180 for unknown task types.
        """
        return self.data["timeout_thresholds"].get(task_type, 180)

    def update_timeout_threshold(self, task_type: str, new_value: int) -> None:
        """Update and persist the timeout threshold for *task_type*.

        Args:
            task_type: The task type key to update.
            new_value: New threshold value in seconds.
        """
        self.data["timeout_thresholds"][task_type] = new_value
        self.save()

    def get_recovery_strategy(self, error_type: str) -> Optional[str]:
        """Return the first known recovery action for *error_type*.

        Args:
            error_type: Exception class name or error category.

        Returns:
            Recovery action string, or ``None`` if none are recorded.
        """
        if error_type in self.data["error_patterns"]:
            actions = self.data["error_patterns"][error_type].get("recovery_actions", [])
            if actions:
                return actions[0]
        return None


class AgentManager:
    """Multi-agent manager responsible for spawning and monitoring agents."""

    def __init__(self) -> None:
        self.memory = AgentMemory()
        self.agents: Dict[str, Agent] = {}
        self.task_queue: queue.Queue = queue.Queue()
        self.result_queue: queue.Queue = queue.Queue()
        self.running = False
        self._agent_counter = 0
        self._lock = threading.Lock()

    def _generate_agent_id(self, agent_type: AgentType) -> str:
        """Generate a unique agent ID.

        Args:
            agent_type: The role of the new agent.

        Returns:
            Unique string identifier combining type, counter, and timestamp.
        """
        with self._lock:
            self._agent_counter += 1
            return f"{agent_type.value}_{self._agent_counter}_{int(time.time())}"

    def create_agent(self, agent_type: AgentType) -> Agent:
        """Instantiate and register a new agent.

        Args:
            agent_type: The role to assign to the new agent.

        Returns:
            The newly created :class:`Agent` instance.
        """
        agent_id = self._generate_agent_id(agent_type)
        agent = Agent(agent_id=agent_id, agent_type=agent_type)
        self.agents[agent_id] = agent
        logger.debug("Agent created: %s (%s)", agent_id[:20], agent_type.value)
        print(f"  [에이전트] {agent_type.value} 생성: {agent_id[:20]}...")
        return agent

    def spawn_helper_agent(self, task: AgentTask, reason: str) -> Agent:
        """Deploy a helper agent in response to a timeout or performance issue.

        Args:
            task: The task that triggered helper deployment.
            reason: Human-readable reason for deploying the helper.

        Returns:
            The newly created helper :class:`Agent`.
        """
        logger.info("Spawning helper agent (reason: %s)", reason)
        print(f"\n  헬퍼 에이전트 투입 (사유: {reason})")
        helper = self.create_agent(AgentType.HELPER)
        helper.current_task = task
        helper.status = AgentStatus.RUNNING
        return helper

    def spawn_recovery_agent(self, error: str, task: AgentTask) -> Agent:
        """Deploy a recovery agent in response to an error.

        Args:
            error: String representation of the error that occurred.
            task: The failing :class:`AgentTask`.

        Returns:
            The newly created recovery :class:`Agent`.
        """
        logger.info("Spawning recovery agent (error: %s)", error[:50])
        print(f"\n  복구 에이전트 투입 (에러: {error[:50]}...)")
        recovery = self.create_agent(AgentType.RECOVERY)
        recovery.current_task = task
        recovery.status = AgentStatus.RUNNING

        error_type = "unknown"
        strategy = self.memory.get_recovery_strategy(error_type)
        if strategy:
            logger.info("Applying learned recovery strategy: %s", strategy)
            print(f"    학습된 복구 전략 적용: {strategy}")

        return recovery

    async def monitor_task(
        self,
        task: AgentTask,
        check_fn: Callable[[], bool],
        check_interval: int = 10,
        on_timeout: Optional[Callable] = None,
        on_error: Optional[Callable] = None,
    ) -> bool:
        """Poll *task* until it completes, times out, or raises an error.

        On timeout a helper agent is spawned and the threshold is adaptively
        increased by :data:`_TIMEOUT_GROWTH_FACTOR`.  On error a recovery
        agent is spawned and *on_error* is invoked.

        Args:
            task: The :class:`AgentTask` to monitor.
            check_fn: Zero-argument callable that returns ``True`` when the
                task is complete.
            check_interval: Polling interval in seconds (default 10).
            on_timeout: Async callback invoked with ``(task, helper_agent)``
                on first timeout detection.
            on_error: Async callback invoked with ``(task, recovery_agent, exc)``
                on exception.  Should return ``True`` to indicate the error was
                recovered and the monitoring loop should continue.

        Returns:
            ``True`` if the task completed successfully, ``False`` otherwise.
        """
        task.status = AgentStatus.RUNNING
        task.started_at = time.time()

        timeout = self.memory.get_timeout_threshold(task.task_type)
        helper_spawned = False
        check_count = 0

        logger.info("Monitoring task '%s' (timeout=%ds, interval=%ds)", task.task_type, timeout, check_interval)
        print(f"\n  [모니터] 작업 감시 시작: {task.task_type}")
        print(f"    타임아웃: {timeout}초, 체크 간격: {check_interval}초")

        while True:
            try:
                elapsed = time.time() - task.started_at
                check_count += 1

                if check_fn():
                    task.status = AgentStatus.COMPLETED
                    task.completed_at = time.time()
                    self.memory.record_task(task)
                    print(f"\n  작업 완료! (소요시간: {int(elapsed)}초)")
                    return True

                if elapsed > timeout:
                    if not helper_spawned:
                        task.status = AgentStatus.TIMEOUT
                        logger.warning("Task '%s' timed out after %ds", task.task_type, int(elapsed))
                        print(f"\n  타임아웃 감지 ({int(elapsed)}초 > {timeout}초)")

                        helper = self.spawn_helper_agent(task, "timeout")
                        helper_spawned = True

                        if on_timeout:
                            try:
                                await on_timeout(task, helper)
                            except Exception as e:
                                logger.error("Helper agent callback error: %s", e)
                                print(f"    헬퍼 에이전트 오류: {e}")

                        new_timeout = int(timeout * _TIMEOUT_GROWTH_FACTOR)
                        self.memory.update_timeout_threshold(task.task_type, new_timeout)
                        logger.info("Timeout threshold updated: %ds → %ds", timeout, new_timeout)
                        print(f"    타임아웃 임계값 학습: {timeout}초 → {new_timeout}초")

                    # 추가 대기 (최대 2배까지)
                    if elapsed > timeout * 2:
                        task.status = AgentStatus.ERROR
                        task.error = "Extended timeout exceeded"
                        self.memory.record_task(task)
                        return False

                # 진행 상황 출력
                if check_count % 3 == 0:
                    print(f"\r    체크 #{check_count}: {int(elapsed)}초 경과...", end="", flush=True)

                await asyncio.sleep(check_interval)

            except Exception as e:
                task.status = AgentStatus.ERROR
                task.error = str(e)
                task.completed_at = time.time()

                logger.error("Task '%s' error: %s", task.task_type, e)
                print(f"\n  에러 발생: {e}")

                recovery = self.spawn_recovery_agent(str(e), task)

                recovery_action = "retry" if task.retries < _MAX_RETRIES else "skip"
                self.memory.record_error(type(e).__name__, str(e), recovery_action)

                if on_error:
                    try:
                        recovered = await on_error(task, recovery, e)
                        if recovered:
                            task.retries += 1
                            task.status = AgentStatus.RUNNING
                            task.error = None
                            logger.info("Recovery succeeded; retry #%d", task.retries)
                            print(f"    복구 성공! 재시도 #{task.retries}")
                            continue
                    except Exception as recovery_error:
                        logger.error("Recovery callback failed: %s", recovery_error)
                        print(f"    복구 실패: {recovery_error}")

                self.memory.record_task(task)
                return False

        return False


class NoterangMultiAgent:
    """High-level multi-agent facade for Noterang slide and research tasks.

    Wraps :class:`AgentManager` and drives the ``nlm`` CLI to create slides
    and run research, while monitoring for timeouts and errors.
    """

    def __init__(self) -> None:
        self.manager = AgentManager()
        self.nlm_exe = Path.home() / "AppData/Roaming/Python/Python313/Scripts/nlm.exe"

    def run_nlm(
        self,
        args: List[str],
        timeout: int = 120,
    ) -> tuple:
        """Execute the ``nlm`` CLI with the given arguments.

        Args:
            args: Command-line arguments appended to the ``nlm`` executable.
            timeout: Maximum execution time in seconds (default 120).

        Returns:
            Tuple of ``(success: bool, stdout: str, stderr: str)``.
        """
        import subprocess
        import os

        cmd = [str(self.nlm_exe)] + args
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'

        try:
            result = subprocess.run(cmd, capture_output=True, timeout=timeout, env=env)
            stdout = result.stdout.decode('utf-8', errors='replace') if result.stdout else ''
            stderr = result.stderr.decode('utf-8', errors='replace') if result.stderr else ''
            return result.returncode == 0, stdout, stderr
        except Exception as e:
            return False, '', str(e)

    async def create_slides_with_monitoring(
        self,
        notebook_id: str,
        language: str = "ko",
        focus: Optional[str] = None,
    ) -> Optional[str]:
        """Create slides for a notebook and monitor completion.

        Args:
            notebook_id: Target notebook identifier.
            language: Slide language code (default ``"ko"``).
            focus: Optional topic focus hint for the slide generator.

        Returns:
            Artifact ID string on success, or ``None`` on failure.
        """

        # 작업 생성
        task = AgentTask(
            task_id=f"slides_{int(time.time())}",
            task_type="slides_create",
            params={"notebook_id": notebook_id, "language": language, "focus": focus}
        )

        # 슬라이드 생성 시작
        args = ["slides", "create", notebook_id, "--language", language, "--confirm"]
        if focus:
            args.extend(["--focus", focus])

        print(f"\n[슬라이드 생성] 노트북: {notebook_id[:8]}...")
        success, stdout, stderr = self.run_nlm(args, timeout=60)

        if not success:
            logger.error("Slide creation failed: %s", stderr[:100])
            print(f"  생성 시작 실패: {stderr[:100]}")
            return None

        # Artifact ID 추출
        artifact_id = None
        for line in stdout.split('\n'):
            if 'Artifact ID:' in line:
                artifact_id = line.split('Artifact ID:')[1].strip()
                break

        print(f"  Artifact ID: {artifact_id}")

        # 완료 체크 함수
        def check_completion() -> bool:
            ok, out, _ = self.run_nlm(["studio", "status", notebook_id])
            return ok and '"status": "completed"' in out

        async def on_timeout(task: AgentTask, helper: Agent) -> None:
            """Helper callback: re-check status and retry if failed."""
            print("    [헬퍼] 상태 재확인 중...")
            _, status_out, _ = self.run_nlm(["studio", "status", notebook_id])
            print(f"    [헬퍼] 현재 상태: {status_out[:100]}...")

            if '"status": "in_progress"' in status_out:
                logger.debug("Helper agent: slide generation still in progress")
                print("    [헬퍼] 아직 진행 중 - 대기 계속")
                return

            if '"status": "failed"' in status_out:
                logger.warning("Slide generation failed; retrying via helper agent")
                print("    [헬퍼] 실패 감지 - 재생성 시도")
                self.run_nlm(args, timeout=60)

        async def on_error(task: AgentTask, recovery: Agent, error: Exception) -> bool:
            """Recovery callback: re-authenticate or wait for transient errors."""
            logger.info("Recovery analysis for error type: %s", type(error).__name__)
            print(f"    [복구] 에러 분석: {type(error).__name__}")

            error_str = str(error).lower()
            if "auth" in error_str or "expired" in error_str:
                print("    [복구] 인증 재시도...")
                from .auth import ensure_auth as _ensure_auth
                await _ensure_auth()
                return True

            # 네트워크 에러면 재시도
            if "timeout" in str(error).lower() or "connection" in str(error).lower():
                print(f"    [복구] 네트워크 재시도 대기...")
                await asyncio.sleep(5)
                return True

            return False

        # 모니터링 시작
        completed = await self.manager.monitor_task(
            task=task,
            check_fn=check_completion,
            check_interval=10,
            on_timeout=on_timeout,
            on_error=on_error
        )

        if completed:
            return artifact_id
        return None

    async def run_research_with_monitoring(
        self,
        notebook_id: str,
        query: str,
        mode: str = "fast",
    ) -> tuple:
        """Run a research task and monitor it until completion.

        Args:
            notebook_id: Target notebook identifier.
            query: Research query string.
            mode: Research mode (e.g. ``"fast"``).

        Returns:
            Tuple of ``(success: bool, imported_count: int)``.
        """
        task = AgentTask(
            task_id=f"research_{int(time.time())}",
            task_type="research",
            params={"notebook_id": notebook_id, "query": query, "mode": mode},
        )

        print(f"\n[연구] 쿼리: {query}")

        success, stdout, _ = self.run_nlm([
            "research", "start", query,
            "--notebook-id", notebook_id,
            "--mode", mode,
        ])

        if not success:
            logger.error("Research start failed for query: %s", query)
            print("  연구 시작 실패")
            return False, 0

        task_id: Optional[str] = None
        for line in stdout.split('\n'):
            if 'Task ID:' in line:
                task_id = line.split('Task ID:')[1].strip()
                break

        def check_completion() -> bool:
            ok, out, _ = self.run_nlm(["research", "status", notebook_id])
            return ok and "completed" in out.lower()

        completed = await self.manager.monitor_task(
            task=task,
            check_fn=check_completion,
            check_interval=5,
        )

        if completed and task_id:
            _, import_out, _ = self.run_nlm(["research", "import", notebook_id, task_id])
            imported = 0
            if "Imported" in import_out:
                try:
                    imported = int(import_out.split("Imported")[1].split("source")[0].strip())
                except ValueError:
                    logger.warning("Could not parse imported source count from output")
            return True, imported

        return False, 0

    def get_memory_stats(self) -> Dict[str, Any]:
        """Return a summary of agent performance and memory statistics.

        Returns:
            Dictionary with keys ``"performance"``, ``"error_patterns"``,
            ``"timeout_thresholds"``, and ``"agents_created"``.
        """
        return {
            "performance": self.manager.memory.data["performance_stats"],
            "error_patterns": list(self.manager.memory.data["error_patterns"].keys()),
            "timeout_thresholds": self.manager.memory.data["timeout_thresholds"],
            "agents_created": len(self.manager.agents),
        }


# Module-level singleton
_noterang_agent: Optional[NoterangMultiAgent] = None


def get_noterang_agent() -> NoterangMultiAgent:
    """Return the module-level singleton :class:`NoterangMultiAgent` instance.

    The instance is created on first call and reused thereafter.

    Returns:
        The shared :class:`NoterangMultiAgent` instance.
    """
    global _noterang_agent
    if _noterang_agent is None:
        _noterang_agent = NoterangMultiAgent()
    return _noterang_agent


async def main() -> None:
    """Run a self-test of the multi-agent system and print memory statistics."""
    agent = get_noterang_agent()

    logger.info("Noterang multi-agent system self-test starting")
    print("=" * 60)
    print("노트랑 멀티 에이전트 시스템 테스트")
    print("=" * 60)

    stats = agent.get_memory_stats()
    print(f"\n현재 메모리 상태:")
    print(f"  총 작업: {stats['performance']['total_tasks']}")
    print(f"  성공: {stats['performance']['successful_tasks']}")
    print(f"  실패: {stats['performance']['failed_tasks']}")
    print(f"  타임아웃 설정: {stats['timeout_thresholds']}")

    logger.info("Self-test complete")
    print("\n테스트 완료!")


if __name__ == "__main__":
    asyncio.run(main())
