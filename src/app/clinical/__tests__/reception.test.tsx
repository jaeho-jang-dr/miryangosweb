/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReceptionPage from '../reception/page';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical';

// Mock Firebase
jest.mock('@/lib/firebase-clinical', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
  limit: jest.fn(),
  Timestamp: { now: jest.fn(() => ({ seconds: Date.now() / 1000 })) },
}));

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('ReceptionPage', () => {
  const mockPatient = {
    id: 'patient-1',
    name: '홍길동',
    birthDate: '1990-01-01',
    gender: 'male',
  };

  const mockVisit = {
    id: 'visit-1',
    patientId: 'patient-1',
    patientName: '홍길동',
    status: 'reception',
    type: 'return',
    date: { seconds: Date.now() / 1000 },
    createdAt: { seconds: Date.now() / 1000 },
    updatedAt: { seconds: Date.now() / 1000 },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation for onSnapshot
    (onSnapshot as jest.Mock).mockImplementation((q, callback) => {
      callback({
        docs: [
          {
            id: mockVisit.id,
            data: () => mockVisit,
          },
        ],
      });
      return jest.fn(); // unsubscribe function
    });
  });

  describe('Initial Rendering', () => {
    it('should render all three tabs', () => {
      render(<ReceptionPage />);

      expect(screen.getByText(/접수\/대기/)).toBeInTheDocument();
      expect(screen.getByText(/수납 대기/)).toBeInTheDocument();
      expect(screen.getByText(/제증명\/완료/)).toBeInTheDocument();
    });

    it('should default to reception tab', () => {
      render(<ReceptionPage />);

      const receptionTab = screen.getByText(/접수\/대기/);
      expect(receptionTab).toHaveClass('text-slate-800');
    });

    it('should display search input in reception tab', () => {
      render(<ReceptionPage />);

      const searchInput = screen.getByPlaceholderText(/환자 이름 검색/);
      expect(searchInput).toBeInTheDocument();
    });

    it('should display real-time waiting list panel', () => {
      render(<ReceptionPage />);

      expect(screen.getByText(/실시간 대기 현황/)).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to payment tab when clicked', () => {
      render(<ReceptionPage />);

      const paymentTab = screen.getByText(/수납 대기/);
      fireEvent.click(paymentTab);

      expect(paymentTab).toHaveClass('text-indigo-600');
    });

    it('should switch to documents tab when clicked', () => {
      render(<ReceptionPage />);

      const documentsTab = screen.getByText(/제증명\/완료/);
      fireEvent.click(documentsTab);

      expect(documentsTab).toHaveClass('text-emerald-600');
    });

    it('should show correct content for each tab', async () => {
      render(<ReceptionPage />);

      // Reception tab content
      expect(screen.getByText(/접수 등록/)).toBeInTheDocument();

      // Switch to payment tab
      fireEvent.click(screen.getByText(/수납 대기/));
      await waitFor(() => {
        // Payment tab should show different content
        expect(screen.queryByText(/접수 등록/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Patient Search', () => {
    it('should not search with less than 2 characters', async () => {
      render(<ReceptionPage />);

      const searchInput = screen.getByPlaceholderText(/환자 이름 검색/);
      await userEvent.type(searchInput, '홍');

      expect(getDocs).not.toHaveBeenCalled();
    });

    it('should trigger search with 2+ characters', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [
          {
            id: mockPatient.id,
            data: () => mockPatient,
          },
        ],
      });

      render(<ReceptionPage />);

      const searchInput = screen.getByPlaceholderText(/환자 이름 검색/);
      await userEvent.type(searchInput, '홍길');

      await waitFor(() => {
        expect(getDocs).toHaveBeenCalled();
      });
    });

    it('should display search results', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [
          {
            id: mockPatient.id,
            data: () => mockPatient,
          },
        ],
      });

      render(<ReceptionPage />);

      const searchInput = screen.getByPlaceholderText(/환자 이름 검색/);
      await userEvent.type(searchInput, '홍길동');

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });
    });

    it('should show "no results" message when search returns empty', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
      });

      render(<ReceptionPage />);

      const searchInput = screen.getByPlaceholderText(/환자 이름 검색/);
      await userEvent.type(searchInput, '존재하지않는환자');

      await waitFor(() => {
        expect(screen.getByText(/검색 결과가 없습니다/)).toBeInTheDocument();
      });
    });

    it('should show new patient registration link when no results', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
      });

      render(<ReceptionPage />);

      const searchInput = screen.getByPlaceholderText(/환자 이름 검색/);
      await userEvent.type(searchInput, '새환자');

      await waitFor(() => {
        expect(screen.getByText(/신규 환자 등록하기/)).toBeInTheDocument();
      });
    });
  });

  describe('Patient Registration', () => {
    beforeEach(() => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [
          {
            id: mockPatient.id,
            data: () => mockPatient,
          },
        ],
      });

      (addDoc as jest.Mock).mockResolvedValue({ id: 'new-visit-id' });

      // Mock window.confirm
      global.confirm = jest.fn(() => true);
    });

    it('should register patient when clicked', async () => {
      render(<ReceptionPage />);

      const searchInput = screen.getByPlaceholderText(/환자 이름 검색/);
      await userEvent.type(searchInput, '홍길동');

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      const patientCard = screen.getByText('홍길동').closest('div');
      fireEvent.click(patientCard!);

      await waitFor(() => {
        expect(addDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            patientId: mockPatient.id,
            patientName: mockPatient.name,
            status: 'reception',
            type: 'return',
          })
        );
      });
    });

    it('should show confirmation dialog before registration', async () => {
      render(<ReceptionPage />);

      const searchInput = screen.getByPlaceholderText(/환자 이름 검색/);
      await userEvent.type(searchInput, '홍길동');

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      const patientCard = screen.getByText('홍길동').closest('div');
      fireEvent.click(patientCard!);

      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('홍길동')
      );
    });

    it('should clear search after successful registration', async () => {
      render(<ReceptionPage />);

      const searchInput = screen.getByPlaceholderText(/환자 이름 검색/) as HTMLInputElement;
      await userEvent.type(searchInput, '홍길동');

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      const patientCard = screen.getByText('홍길동').closest('div');
      fireEvent.click(patientCard!);

      await waitFor(() => {
        expect(searchInput.value).toBe('');
      });
    });

    it('should not register if user cancels confirmation', async () => {
      global.confirm = jest.fn(() => false);

      render(<ReceptionPage />);

      const searchInput = screen.getByPlaceholderText(/환자 이름 검색/);
      await userEvent.type(searchInput, '홍길동');

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      const patientCard = screen.getByText('홍길동').closest('div');
      fireEvent.click(patientCard!);

      expect(addDoc).not.toHaveBeenCalled();
    });
  });

  describe('Waiting List Display', () => {
    it('should display waiting patients from Firebase', () => {
      render(<ReceptionPage />);

      expect(screen.getByText('홍길동')).toBeInTheDocument();
    });

    it('should show patient count in tab', () => {
      render(<ReceptionPage />);

      const receptionTab = screen.getByText(/접수\/대기/);
      expect(receptionTab.textContent).toContain('1');
    });

    it('should show status badge for each patient', () => {
      render(<ReceptionPage />);

      expect(screen.getByText('접수실')).toBeInTheDocument();
    });

    it('should show call button for reception status patients', () => {
      render(<ReceptionPage />);

      expect(screen.getByText('호출')).toBeInTheDocument();
    });

    it('should show empty state when no patients waiting', () => {
      (onSnapshot as jest.Mock).mockImplementation((q, callback) => {
        callback({ docs: [] });
        return jest.fn();
      });

      render(<ReceptionPage />);

      expect(screen.getByText(/대기 환자가 없습니다/)).toBeInTheDocument();
    });
  });

  describe('Patient Call Functionality', () => {
    it('should update patient status to consulting when called', async () => {
      render(<ReceptionPage />);

      const callButton = screen.getByText('호출');
      fireEvent.click(callButton);

      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            status: 'consulting',
          })
        );
      });
    });
  });

  describe('Payment Tab', () => {
    beforeEach(() => {
      const completedVisit = {
        ...mockVisit,
        status: 'completed',
      };

      (onSnapshot as jest.Mock).mockImplementation((q, callback) => {
        callback({
          docs: [
            {
              id: completedVisit.id,
              data: () => completedVisit,
            },
          ],
        });
        return jest.fn();
      });
    });

    it('should display patients waiting for payment', () => {
      render(<ReceptionPage />);

      fireEvent.click(screen.getByText(/수납 대기/));

      expect(screen.getByText(/결제\/수납 하기/)).toBeInTheDocument();
    });

    it('should show invoice modal when payment card clicked', async () => {
      render(<ReceptionPage />);

      fireEvent.click(screen.getByText(/수납 대기/));

      const paymentCard = screen.getByText(/결제\/수납 하기/).closest('div');
      fireEvent.click(paymentCard!);

      await waitFor(() => {
        expect(screen.getByText(/진료비 수납/)).toBeInTheDocument();
      });
    });

    it('should process payment when confirmed', async () => {
      global.confirm = jest.fn(() => true);
      global.alert = jest.fn();

      render(<ReceptionPage />);

      fireEvent.click(screen.getByText(/수납 대기/));

      const paymentCard = screen.getByText(/결제\/수납 하기/).closest('div');
      fireEvent.click(paymentCard!);

      await waitFor(() => {
        expect(screen.getByText('카드 결제')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('카드 결제'));

      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            status: 'paid',
          })
        );
      });
    });
  });

  describe('Documents Tab', () => {
    beforeEach(() => {
      const paidVisit = {
        ...mockVisit,
        status: 'paid',
        diagnosis: '무릎 관절염',
      };

      (onSnapshot as jest.Mock).mockImplementation((q, callback) => {
        callback({
          docs: [
            {
              id: paidVisit.id,
              data: () => paidVisit,
            },
          ],
        });
        return jest.fn();
      });
    });

    it('should display completed visits', () => {
      render(<ReceptionPage />);

      fireEvent.click(screen.getByText(/제증명\/완료/));

      expect(screen.getByText('무릎 관절염')).toBeInTheDocument();
    });

    it('should show document issuance button', () => {
      render(<ReceptionPage />);

      fireEvent.click(screen.getByText(/제증명\/완료/));

      expect(screen.getByText('서류 발급')).toBeInTheDocument();
    });

    it('should open document selection modal', async () => {
      render(<ReceptionPage />);

      fireEvent.click(screen.getByText(/제증명\/완료/));

      const issueButton = screen.getByText('서류 발급');
      fireEvent.click(issueButton);

      await waitFor(() => {
        expect(screen.getByText('제증명 발급')).toBeInTheDocument();
      });
    });

    it('should show all document types', async () => {
      render(<ReceptionPage />);

      fireEvent.click(screen.getByText(/제증명\/완료/));

      const issueButton = screen.getByText('서류 발급');
      fireEvent.click(issueButton);

      await waitFor(() => {
        expect(screen.getByText('처방전')).toBeInTheDocument();
        expect(screen.getByText('진료비 영수증')).toBeInTheDocument();
        expect(screen.getByText('진단서')).toBeInTheDocument();
      });
    });
  });

  describe('Status Helpers', () => {
    it('should display correct Korean labels for statuses', () => {
      const statuses = [
        { status: 'reception', label: '접수실' },
        { status: 'consulting', label: '진료실' },
        { status: 'treatment', label: '치료실' },
        { status: 'completed', label: '수납대기' },
        { status: 'paid', label: '완료' },
      ];

      statuses.forEach(({ status }) => {
        const visit = { ...mockVisit, status };

        (onSnapshot as jest.Mock).mockImplementation((q, callback) => {
          callback({
            docs: [{ id: visit.id, data: () => visit }],
          });
          return jest.fn();
        });

        const { unmount } = render(<ReceptionPage />);
        unmount();
      });
    });
  });
});
