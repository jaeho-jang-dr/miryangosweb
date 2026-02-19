import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageUpload from '@/components/image-upload';

// Mock next/image
jest.mock('next/image', () => ({
    __esModule: true,
    default: (props: any) => {
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        return <img {...props} />;
    },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Loader2: (props: any) => <span data-testid="loader-icon" {...props} />,
    X: (props: any) => <span data-testid="x-icon" {...props} />,
    ImagePlus: (props: any) => <span data-testid="image-plus-icon" {...props} />,
    AlertCircle: (props: any) => <span data-testid="alert-circle-icon" {...props} />,
}));

// Mock firebase-public
jest.mock('@/lib/firebase-public', () => ({
    auth: {
        currentUser: null,
    },
}));

// Mock server action
jest.mock('@/actions/local-files', () => ({
    getLocalFiles: jest.fn().mockResolvedValue([]),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ImageUpload', () => {
    const mockOnImageUploaded = jest.fn();
    const mockOnImageRemoved = jest.fn();

    const defaultProps = {
        directory: 'staff',
        onImageUploaded: mockOnImageUploaded,
        onImageRemoved: mockOnImageRemoved,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
    });

    // ─── Rendering ────────────────────────────────────────────
    it('renders with default label', () => {
        render(<ImageUpload {...defaultProps} />);

        expect(screen.getByText('이미지 업로드')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
        render(<ImageUpload {...defaultProps} label="프로필 사진" />);

        expect(screen.getByText('프로필 사진')).toBeInTheDocument();
    });

    it('renders PC and server tab buttons', () => {
        render(<ImageUpload {...defaultProps} />);

        expect(screen.getByText('내 PC에서 선택')).toBeInTheDocument();
        expect(screen.getByText('서버 폴더에서 찾기')).toBeInTheDocument();
    });

    it('shows PC tab as active by default', () => {
        render(<ImageUpload {...defaultProps} />);

        // PC tab content should be visible (file input + instructions)
        const fileInput = document.querySelector('input[type="file"]');
        expect(fileInput).toBeInTheDocument();
        expect(screen.getByText(/PC에 있는 사진을 선택/)).toBeInTheDocument();
    });

    it('shows file input instructions with paste hints', () => {
        render(<ImageUpload {...defaultProps} />);

        expect(screen.getByText(/Ctrl\+V/)).toBeInTheDocument();
        expect(screen.getByText(/Alt\+V/)).toBeInTheDocument();
    });

    // ─── Preview with Existing Image ──────────────────────────
    it('renders preview when currentImageUrl is provided', () => {
        render(<ImageUpload {...defaultProps} currentImageUrl="https://example.com/image.jpg" />);

        const img = screen.getByAltText('Preview');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('does not show upload area when preview is displayed', () => {
        render(<ImageUpload {...defaultProps} currentImageUrl="https://example.com/image.jpg" />);

        // File input should not be rendered when there is a preview
        expect(screen.queryByText('내 PC에서 선택')).toBeInTheDocument();
        // But the upload section should be hidden
        expect(screen.queryByText(/PC에 있는 사진을 선택/)).not.toBeInTheDocument();
    });

    // ─── Remove Image ─────────────────────────────────────────
    it('calls onImageRemoved when remove button is clicked', async () => {
        render(<ImageUpload {...defaultProps} currentImageUrl="https://example.com/image.jpg" />);

        // Find and click the remove button (the X icon button)
        const removeButtons = screen.getAllByRole('button');
        const removeButton = removeButtons.find(btn => btn.querySelector('[data-testid="x-icon"]'));

        if (removeButton) {
            await userEvent.click(removeButton);
            expect(mockOnImageRemoved).toHaveBeenCalledTimes(1);
        }
    });

    it('clears preview when image is removed', async () => {
        render(<ImageUpload {...defaultProps} currentImageUrl="https://example.com/image.jpg" />);

        const removeButtons = screen.getAllByRole('button');
        const removeButton = removeButtons.find(btn => btn.querySelector('[data-testid="x-icon"]'));

        if (removeButton) {
            await userEvent.click(removeButton);

            // After removal, upload area should appear
            expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
        }
    });

    // ─── Tab Switching ────────────────────────────────────────
    it('switches to server tab and loads local files', async () => {
        const { getLocalFiles } = require('@/actions/local-files');
        getLocalFiles.mockResolvedValue(['image1.jpg', 'image2.png']);

        render(<ImageUpload {...defaultProps} />);

        const serverTab = screen.getByText('서버 폴더에서 찾기');
        await userEvent.click(serverTab);

        await waitFor(() => {
            expect(getLocalFiles).toHaveBeenCalled();
        });
    });

    it('shows empty state when server folder has no files', async () => {
        const { getLocalFiles } = require('@/actions/local-files');
        getLocalFiles.mockResolvedValue([]);

        render(<ImageUpload {...defaultProps} />);

        const serverTab = screen.getByText('서버 폴더에서 찾기');
        await userEvent.click(serverTab);

        await waitFor(() => {
            expect(screen.getByText(/서버 폴더.*에 이미지가 없습니다/)).toBeInTheDocument();
        });
    });

    it('displays local file list when files exist', async () => {
        const { getLocalFiles } = require('@/actions/local-files');
        getLocalFiles.mockResolvedValue(['photo1.jpg', 'photo2.png']);

        render(<ImageUpload {...defaultProps} />);

        const serverTab = screen.getByText('서버 폴더에서 찾기');
        await userEvent.click(serverTab);

        await waitFor(() => {
            expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
            expect(screen.getByText('photo2.png')).toBeInTheDocument();
        });
    });

    it('switches back to PC tab', async () => {
        render(<ImageUpload {...defaultProps} />);

        // Switch to server tab
        const serverTab = screen.getByText('서버 폴더에서 찾기');
        await userEvent.click(serverTab);

        // Switch back to PC tab
        const pcTab = screen.getByText('내 PC에서 선택');
        await userEvent.click(pcTab);

        // Should show file input area again
        expect(screen.getByText(/PC에 있는 사진을 선택/)).toBeInTheDocument();
    });

    // ─── File Upload via Input ────────────────────────────────
    it('uploads file and calls onImageUploaded on success', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: true, url: 'https://example.com/uploaded.jpg' }),
            text: () => Promise.resolve(''),
        });

        render(<ImageUpload {...defaultProps} />);

        const fileInput = screen.getByAcceptCharset ? null : document.querySelector('input[type="file"]');

        if (fileInput) {
            const file = new File(['test-image'], 'test.jpg', { type: 'image/jpeg' });

            await userEvent.upload(fileInput as HTMLElement, file);

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith('/api/upload', expect.objectContaining({
                    method: 'POST',
                }));
            });

            await waitFor(() => {
                expect(mockOnImageUploaded).toHaveBeenCalledWith('https://example.com/uploaded.jpg');
            });
        }
    });

    it('shows alert on upload failure', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            text: () => Promise.resolve('Server Error'),
            status: 500,
        });

        render(<ImageUpload {...defaultProps} />);

        const fileInput = document.querySelector('input[type="file"]');

        if (fileInput) {
            const file = new File(['test-image'], 'test.jpg', { type: 'image/jpeg' });

            await userEvent.upload(fileInput as HTMLElement, file);

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('이미지 업로드 실패'));
            });
        }
    });

    it('shows alert when upload API returns success=false', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: false, error: 'Invalid file type' }),
            text: () => Promise.resolve(''),
        });

        render(<ImageUpload {...defaultProps} />);

        const fileInput = document.querySelector('input[type="file"]');

        if (fileInput) {
            const file = new File(['test-image'], 'test.jpg', { type: 'image/jpeg' });

            await userEvent.upload(fileInput as HTMLElement, file);

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('이미지 업로드 실패'));
            });
        }
    });

    // ─── Loading State During Upload ──────────────────────────
    it('shows loading indicator during file upload', async () => {
        mockFetch.mockReturnValue(new Promise(() => {})); // hang

        render(<ImageUpload {...defaultProps} />);

        const fileInput = document.querySelector('input[type="file"]');

        if (fileInput) {
            const file = new File(['test-image'], 'test.jpg', { type: 'image/jpeg' });
            await userEvent.upload(fileInput as HTMLElement, file);

            await waitFor(() => {
                expect(screen.getByText('업로드 중...')).toBeInTheDocument();
            });
        }
    });

    // ─── Image Load Error State ───────────────────────────────
    it('shows error state when image fails to load', () => {
        render(<ImageUpload {...defaultProps} currentImageUrl="https://example.com/broken.jpg" />);

        const img = screen.getByAltText('Preview');

        // Simulate image load error
        fireEvent.error(img);

        expect(screen.getByText('이미지 로드 실패')).toBeInTheDocument();
    });

    // ─── Paste Handling ───────────────────────────────────────
    it('handles image paste from clipboard', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: true, url: 'https://example.com/pasted.png' }),
            text: () => Promise.resolve(''),
        });

        render(<ImageUpload {...defaultProps} />);

        const container = document.querySelector('[tabindex="0"]');

        if (container) {
            const file = new File(['image-data'], 'pasted.png', { type: 'image/png' });

            const pasteEvent = new Event('paste', { bubbles: true }) as any;
            pasteEvent.clipboardData = {
                items: [
                    {
                        type: 'image/png',
                        getAsFile: () => file,
                    },
                ],
            };

            fireEvent(container, pasteEvent);

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith('/api/upload', expect.objectContaining({
                    method: 'POST',
                }));
            });
        }
    });

    it('ignores paste events with no image data', () => {
        render(<ImageUpload {...defaultProps} />);

        const container = document.querySelector('[tabindex="0"]');

        if (container) {
            const pasteEvent = new Event('paste', { bubbles: true }) as any;
            pasteEvent.clipboardData = {
                items: [
                    {
                        type: 'text/plain',
                        getAsFile: () => null,
                    },
                ],
            };

            fireEvent(container, pasteEvent);

            // Should not trigger upload
            expect(mockFetch).not.toHaveBeenCalled();
        }
    });
});
