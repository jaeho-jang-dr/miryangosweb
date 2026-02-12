#!/bin/bash
# =========================================================
# GCP Firestore 자동 백업 설정 (Cloud Scheduler + Cloud Functions)
#
# 이 스크립트는 매일 새벽 3시(KST)에 Firestore를 GCS로 백업합니다.
# 실행 전: gcloud auth login && gcloud config set project miryangosweb
# =========================================================

PROJECT_ID="miryangosweb"
REGION="asia-northeast3"      # Seoul
BUCKET="gs://${PROJECT_ID}-backups"
FUNCTION_NAME="firestoreBackup"
SCHEDULE_NAME="daily-firestore-backup"

echo "=== Setting up Firestore automated backup ==="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Bucket: $BUCKET"
echo ""

# 1. Enable required APIs
echo "[1/5] Enabling APIs..."
gcloud services enable \
  cloudfunctions.googleapis.com \
  cloudscheduler.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  --project=$PROJECT_ID

# 2. Create GCS bucket (if not exists)
echo "[2/5] Creating backup bucket..."
gcloud storage buckets create $BUCKET \
  --project=$PROJECT_ID \
  --location=$REGION \
  --uniform-bucket-level-access \
  2>/dev/null || echo "  Bucket already exists."

# 3. Set lifecycle policy (auto-delete after 90 days)
echo "[3/5] Setting retention policy (90 days)..."
cat > /tmp/lifecycle.json << 'EOF'
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 90}
    }
  ]
}
EOF
gcloud storage buckets update $BUCKET --lifecycle-file=/tmp/lifecycle.json --project=$PROJECT_ID

# 4. Grant Firestore export permission to default service account
echo "[4/5] Granting export permissions..."
SA="${PROJECT_ID}@appspot.gserviceaccount.com"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/datastore.importExportAdmin" \
  --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/storage.admin" \
  --quiet

# 5. Create Cloud Scheduler job (daily 3AM KST)
echo "[5/5] Creating Cloud Scheduler job..."
gcloud scheduler jobs create http $SCHEDULE_NAME \
  --project=$PROJECT_ID \
  --location=$REGION \
  --schedule="0 3 * * *" \
  --time-zone="Asia/Seoul" \
  --uri="https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default):exportDocuments" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body="{\"outputUriPrefix\":\"${BUCKET}/auto\",\"collectionIds\":[\"patients\",\"visits\",\"charts\",\"appointments\",\"audit_logs\",\"signing_keys\",\"users\"]}" \
  --oauth-service-account-email="${SA}" \
  2>/dev/null || echo "  Scheduler job already exists. Use 'gcloud scheduler jobs update' to modify."

echo ""
echo "=== Setup complete ==="
echo "Schedule: 매일 03:00 KST"
echo "Bucket: $BUCKET"
echo "Retention: 90일 후 자동 삭제"
echo ""
echo "수동 실행: gcloud scheduler jobs run $SCHEDULE_NAME --project=$PROJECT_ID --location=$REGION"
echo "상태 확인: gcloud scheduler jobs describe $SCHEDULE_NAME --project=$PROJECT_ID --location=$REGION"
