import { extractPptxText, isPptxFile, type PptxParseResult } from '../pptx-parser';
import JSZip from 'jszip';

describe('pptx-parser', () => {
    describe('isPptxFile', () => {
        it('should return true for .pptx extension', () => {
            expect(isPptxFile('presentation.pptx')).toBe(true);
            expect(isPptxFile('DOCUMENT.PPTX')).toBe(true);
        });

        it('should return true for correct MIME type', () => {
            expect(isPptxFile('file', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe(true);
        });

        it('should return false for other extensions', () => {
            expect(isPptxFile('document.pdf')).toBe(false);
            expect(isPptxFile('document.docx')).toBe(false);
        });

        it('should return true if either extension or MIME type matches', () => {
            expect(isPptxFile('file.pptx', 'application/pdf')).toBe(true);
            expect(isPptxFile('file.pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe(true);
        });
    });

    describe('extractPptxText', () => {
        it('should return error for empty buffer', async () => {
            const emptyBuffer = Buffer.from('');
            const result = await extractPptxText(emptyBuffer);

            expect(result.success).toBe(false);
            expect(result.error).toContain('비어있습니다');
        });

        it('should return error for invalid PPTX file', async () => {
            const invalidBuffer = Buffer.from('not a zip file');
            const result = await extractPptxText(invalidBuffer);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should extract text from valid PPTX', async () => {
            // Create a minimal PPTX structure
            const zip = new JSZip();

            // Add slide1.xml with text
            const slide1Xml = `<?xml version="1.0"?>
                <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <p:cSld>
                        <p:spTree>
                            <p:sp>
                                <p:txBody>
                                    <a:p><a:r><a:t>Hello World</a:t></a:r></a:p>
                                    <a:p><a:r><a:t>Test Slide</a:t></a:r></a:p>
                                </p:txBody>
                            </p:sp>
                        </p:spTree>
                    </p:cSld>
                </p:sld>`;

            zip.file('ppt/slides/slide1.xml', slide1Xml);

            const buffer = await zip.generateAsync({
                type: 'nodebuffer',
                compression: 'DEFLATE'
            });

            const result = await extractPptxText(buffer);

            expect(result.success).toBe(true);
            expect(result.totalSlides).toBe(1);
            expect(result.slides).toHaveLength(1);
            expect(result.slides[0].slideNumber).toBe(1);
            expect(result.slides[0].text).toContain('Hello World');
            expect(result.slides[0].text).toContain('Test Slide');
        });

        it('should respect maxSlides option', async () => {
            const zip = new JSZip();

            // Add 3 slides
            for (let i = 1; i <= 3; i++) {
                zip.file(`ppt/slides/slide${i}.xml`, `
                    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                        <a:t>Slide ${i}</a:t>
                    </p:sld>
                `);
            }

            const buffer = await zip.generateAsync({ type: 'nodebuffer' });
            const result = await extractPptxText(buffer, { maxSlides: 2 });

            expect(result.success).toBe(true);
            expect(result.slides).toHaveLength(2);
            expect(result.totalSlides).toBe(3); // Total in file
        });

        it('should respect maxTextLength option', async () => {
            const zip = new JSZip();
            const longText = 'A'.repeat(1000);

            zip.file('ppt/slides/slide1.xml', `
                <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <a:t>${longText}</a:t>
                </p:sld>
            `);

            const buffer = await zip.generateAsync({ type: 'nodebuffer' });
            const result = await extractPptxText(buffer, { maxTextLength: 50 });

            expect(result.success).toBe(true);
            expect(result.totalText.length).toBeLessThanOrEqual(50);
        });

        it('should use bracket format by default', async () => {
            const zip = new JSZip();

            zip.file('ppt/slides/slide1.xml', `
                <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <a:t>Test</a:t>
                </p:sld>
            `);

            const buffer = await zip.generateAsync({ type: 'nodebuffer' });
            const result = await extractPptxText(buffer);

            expect(result.totalText).toContain('[슬라이드 1]');
        });

        it('should use dash format when specified', async () => {
            const zip = new JSZip();

            zip.file('ppt/slides/slide1.xml', `
                <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <a:t>Test</a:t>
                </p:sld>
            `);

            const buffer = await zip.generateAsync({ type: 'nodebuffer' });
            const result = await extractPptxText(buffer, { slideFormat: 'dash' });

            expect(result.totalText).toContain('--- 슬라이드 1 ---');
        });

        it('should filter out empty text', async () => {
            const zip = new JSZip();

            zip.file('ppt/slides/slide1.xml', `
                <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <a:t>   </a:t>
                    <a:t></a:t>
                    <a:t>Valid Text</a:t>
                </p:sld>
            `);

            const buffer = await zip.generateAsync({ type: 'nodebuffer' });
            const result = await extractPptxText(buffer);

            expect(result.success).toBe(true);
            expect(result.slides[0].text).toBe('Valid Text');
        });

        it('should handle slides with no text', async () => {
            const zip = new JSZip();

            zip.file('ppt/slides/slide1.xml', `
                <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <!-- No text elements -->
                </p:sld>
            `);

            const buffer = await zip.generateAsync({ type: 'nodebuffer' });
            const result = await extractPptxText(buffer);

            // Without images, should fail
            expect(result.success).toBe(false);
            expect(result.error).toContain('내용을 추출할 수 없습니다');
        });

        it('should extract images when includeImages is true', async () => {
            const zip = new JSZip();

            // Add slide
            zip.file('ppt/slides/slide1.xml', `
                <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <a:t>Slide with image</a:t>
                </p:sld>
            `);

            // Add relationship file
            zip.file('ppt/slides/_rels/slide1.xml.rels', `
                <Relationships>
                    <Relationship Id="rId1" Type="..." Target="../media/image1.png"/>
                </Relationships>
            `);

            // Add actual image (1x1 PNG)
            const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
            zip.file('ppt/media/image1.png', pngData);

            const buffer = await zip.generateAsync({ type: 'nodebuffer' });
            const result = await extractPptxText(buffer, { includeImages: true });

            expect(result.success).toBe(true);
            expect(result.totalImages).toBe(1);
            expect(result.slides[0].images).toBeDefined();
            expect(result.slides[0].images).toHaveLength(1);
            expect(result.slides[0].images![0].mimeType).toBe('image/png');
            expect(result.slides[0].images![0].base64).toBeDefined();
        });
    });
});
