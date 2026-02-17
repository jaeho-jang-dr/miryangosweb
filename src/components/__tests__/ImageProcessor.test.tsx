import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageProcessor from '@/components/ImageProcessor';

// Mock next/image
jest.mock('next/image', () => ({
    __esModule: true,
    default: (props: any) => {
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        return <img {...props} />;
    },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helper to get the file input element
function getFileInput(): HTMLInputElement {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (!input) throw new Error('File input not found');
    return input;
}

// Helper to select a file and trigger FileReader
async function selectFile(input: HTMLInputElement, file: File) {
    const mockFileReader = {
        readAsDataURL: jest.fn(),
        result: 'data:image/png;base64,test',
        onloadend: null as (() => void) | null,
    };
    const spy = jest.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as any);

    await userEvent.upload(input, file);

    // Trigger onloadend to complete the preview
    if (mockFileReader.onloadend) {
        mockFileReader.onloadend();
    }

    spy.mockRestore();
}

describe('ImageProcessor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
    });

    // ─── Rendering ────────────────────────────────────────────
    it('renders the form with all controls', () => {
        render(<ImageProcessor />);

        expect(screen.getByText('이미지 처리기')).toBeInTheDocument();
        expect(screen.getByText('이미지 파일 선택')).toBeInTheDocument();
        expect(screen.getByText('너비 (px)')).toBeInTheDocument();
        expect(screen.getByText('높이 (px)')).toBeInTheDocument();
        expect(screen.getByText('품질 (1-100)')).toBeInTheDocument();
        expect(screen.getByText('포맷')).toBeInTheDocument();
    });

    it('renders submit button as disabled when no file is selected', () => {
        render(<ImageProcessor />);

        const submitButton = screen.getByRole('button', { name: '이미지 처리하기' });
        expect(submitButton).toBeDisabled();
    });

    it('renders default option values', () => {
        render(<ImageProcessor />);

        expect(screen.getByDisplayValue('800')).toBeInTheDocument();
        expect(screen.getByDisplayValue('600')).toBeInTheDocument();
        expect(screen.getByDisplayValue('80')).toBeInTheDocument();
    });

    it('renders format selector with all options', () => {
        render(<ImageProcessor />);

        expect(screen.getByText('JPG')).toBeInTheDocument();
        expect(screen.getByText('PNG')).toBeInTheDocument();
        expect(screen.getByText('WebP')).toBeInTheDocument();
        expect(screen.getByText('GIF')).toBeInTheDocument();
    });

    // ─── File Selection ───────────────────────────────────────
    it('enables submit button after file selection', async () => {
        render(<ImageProcessor />);

        const fileInput = getFileInput();
        const file = new File(['test'], 'test.png', { type: 'image/png' });

        await selectFile(fileInput, file);

        const submitButton = screen.getByRole('button', { name: '이미지 처리하기' });
        expect(submitButton).not.toBeDisabled();
    });

    it('clears previous error and result on new file selection', async () => {
        render(<ImageProcessor />);

        const fileInput = getFileInput();
        const file = new File(['test'], 'test.png', { type: 'image/png' });

        await selectFile(fileInput, file);

        expect(screen.queryByText('처리 결과')).not.toBeInTheDocument();
    });

    // ─── Option Changes ───────────────────────────────────────
    it('allows changing width value', async () => {
        render(<ImageProcessor />);

        const widthInput = screen.getByDisplayValue('800') as HTMLInputElement;
        // Use fireEvent.change for controlled number inputs
        fireEvent.change(widthInput, { target: { value: '1024' } });

        expect(widthInput).toHaveValue(1024);
    });

    it('allows changing height value', async () => {
        render(<ImageProcessor />);

        const heightInput = screen.getByDisplayValue('600') as HTMLInputElement;
        fireEvent.change(heightInput, { target: { value: '768' } });

        expect(heightInput).toHaveValue(768);
    });

    it('allows changing quality value', async () => {
        render(<ImageProcessor />);

        const qualityInput = screen.getByDisplayValue('80') as HTMLInputElement;
        fireEvent.change(qualityInput, { target: { value: '90' } });

        expect(qualityInput).toHaveValue(90);
    });

    it('allows changing format selection', async () => {
        render(<ImageProcessor />);

        const formatSelect = screen.getByDisplayValue('JPG');
        await userEvent.selectOptions(formatSelect, 'webp');

        expect(formatSelect).toHaveValue('webp');
    });

    // ─── Form Submission - Success ────────────────────────────
    it('submits form and displays results on success', async () => {
        const mockResult = {
            success: true,
            original: {
                filename: 'test.png',
                url: '/uploads/test.png',
                width: 1920,
                height: 1080,
                format: 'png',
                size: 204800,
            },
            processed: {
                filename: 'test_processed.jpg',
                url: '/uploads/test_processed.jpg',
                width: 800,
                height: 600,
                format: 'jpg',
                size: 51200,
            },
        };

        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResult),
        });

        render(<ImageProcessor />);

        const fileInput = getFileInput();
        const file = new File(['test'], 'test.png', { type: 'image/png' });

        await selectFile(fileInput, file);

        const submitButton = screen.getByRole('button', { name: '이미지 처리하기' });
        await userEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('처리 결과')).toBeInTheDocument();
        });

        expect(screen.getByText('원본')).toBeInTheDocument();
        expect(screen.getByText('처리됨')).toBeInTheDocument();
        expect(screen.getByText('다운로드')).toBeInTheDocument();

        expect(mockFetch).toHaveBeenCalledWith('/api/image/process', expect.objectContaining({
            method: 'POST',
        }));
    });

    // ─── Form Submission - Error ──────────────────────────────
    it('shows error when no file is selected (submit button is disabled)', () => {
        render(<ImageProcessor />);

        const submitButton = screen.getByRole('button', { name: '이미지 처리하기' });
        expect(submitButton).toBeDisabled();
    });

    it('displays server error message on failed API response', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            json: () => Promise.resolve({ error: '이미지 형식이 잘못되었습니다.' }),
        });

        render(<ImageProcessor />);

        const fileInput = getFileInput();
        const file = new File(['test'], 'test.png', { type: 'image/png' });

        await selectFile(fileInput, file);

        const submitButton = screen.getByRole('button', { name: '이미지 처리하기' });
        await userEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('이미지 형식이 잘못되었습니다.')).toBeInTheDocument();
        });
    });

    it('displays generic error message on network failure', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        render(<ImageProcessor />);

        const fileInput = getFileInput();
        const file = new File(['test'], 'test.png', { type: 'image/png' });

        await selectFile(fileInput, file);

        const submitButton = screen.getByRole('button', { name: '이미지 처리하기' });
        await userEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('서버 오류가 발생했습니다.')).toBeInTheDocument();
        });
    });

    // ─── Processing State ─────────────────────────────────────
    it('shows processing state during submission', async () => {
        mockFetch.mockReturnValue(new Promise(() => {})); // hang

        render(<ImageProcessor />);

        const fileInput = getFileInput();
        const file = new File(['test'], 'test.png', { type: 'image/png' });

        await selectFile(fileInput, file);

        const submitButton = screen.getByRole('button', { name: '이미지 처리하기' });
        await userEvent.click(submitButton);

        expect(screen.getByRole('button', { name: '처리 중...' })).toBeDisabled();
    });

    // ─── Preview ──────────────────────────────────────────────
    it('does not show preview before file selection', () => {
        render(<ImageProcessor />);

        expect(screen.queryByText('원본 미리보기')).not.toBeInTheDocument();
    });

    // ─── Default Error for Server Error Without Message ───────
    it('displays default error when server returns error without message', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            json: () => Promise.resolve({}),
        });

        render(<ImageProcessor />);

        const fileInput = getFileInput();
        const file = new File(['test'], 'test.png', { type: 'image/png' });

        await selectFile(fileInput, file);

        const submitButton = screen.getByRole('button', { name: '이미지 처리하기' });
        await userEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('이미지 처리에 실패했습니다.')).toBeInTheDocument();
        });
    });

    // ─── Result display details ───────────────────────────────
    it('displays original and processed image dimensions in results', async () => {
        const mockResult = {
            success: true,
            original: {
                filename: 'photo.jpg',
                url: '/uploads/photo.jpg',
                width: 3000,
                height: 2000,
                format: 'jpeg',
                size: 512000,
            },
            processed: {
                filename: 'photo_processed.webp',
                url: '/uploads/photo_processed.webp',
                width: 800,
                height: 533,
                format: 'webp',
                size: 25600,
            },
        };

        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResult),
        });

        render(<ImageProcessor />);

        const fileInput = getFileInput();
        const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
        await selectFile(fileInput, file);

        await userEvent.click(screen.getByRole('button', { name: '이미지 처리하기' }));

        await waitFor(() => {
            expect(screen.getByText('처리 결과')).toBeInTheDocument();
        });

        // Check dimension info rendered
        expect(screen.getByText(/3000 x 2000/)).toBeInTheDocument();
        expect(screen.getByText(/800 x 533/)).toBeInTheDocument();

        // Check format info
        expect(screen.getByText(/jpeg/)).toBeInTheDocument();
        expect(screen.getByText(/webp/)).toBeInTheDocument();
    });
});
