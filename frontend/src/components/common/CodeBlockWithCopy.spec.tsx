import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CodeBlockWithCopy } from './CodeBlockWithCopy';

describe('CodeBlockWithCopy Component', () => {
  const originalClipboard = navigator.clipboard;
  const originalExecCommand = document.execCommand;

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
    document.execCommand = originalExecCommand;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders code, title/language, and copies via navigator.clipboard.writeText', async () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    render(
      <CodeBlockWithCopy
        code={'void setup() {\n  Serial.begin(115200);\n}'}
        language="cpp"
        title="ESP32 Nümunə Kodu"
        showLineNumbers={true}
      />,
    );

    expect(screen.getByText('ESP32 Nümunə Kodu')).toBeDefined();
    expect(screen.getByText('cpp')).toBeDefined();
    expect(screen.getByText('Serial.begin(115200);')).toBeDefined();

    const copyBtn = screen.getByRole('button', { name: 'Kopyala' });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith('void setup() {\n  Serial.begin(115200);\n}');
    expect(screen.getByText('Kopyalandı!')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.getByText('Kopyala')).toBeDefined();
  });

  it('falls back to document.execCommand when clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    render(<CodeBlockWithCopy code="digitalWrite(13, HIGH);" language="arduino" />);

    const copyBtn = screen.getByRole('button', { name: 'Kopyala' });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(screen.getByText('Kopyalandı!')).toBeDefined();
    expect(document.body.querySelectorAll('textarea').length).toBe(0);
  });

  it('removes temporary textarea from document.body even when document.execCommand throws', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    document.execCommand = vi.fn(() => {
      throw new Error('execCommand blocked');
    });

    render(<CodeBlockWithCopy code="pinMode(13, OUTPUT);" language="arduino" />);

    const copyBtn = screen.getByRole('button', { name: 'Kopyala' });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(document.body.querySelectorAll('textarea').length).toBe(0);
    expect(screen.getByText('Kopyala')).toBeDefined();
  });
});
