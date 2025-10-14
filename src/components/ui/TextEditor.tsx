import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  List, 
  ListOrdered,
  Link,
  Unlink,
  Palette,
  Highlighter,
  Undo,
  Redo,
  Save,
  X,
  Image,
  Table,
  Type
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  value,
  onChange,
  placeholder = "Start typing your content...",
  className,
  onSave,
  onCancel
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [selectedSize, setSelectedSize] = useState('16px');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState('paragraph');
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Colors for text and highlight
  const textColors = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef',
    '#fe0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#9900ff', '#ff00ff'
  ];
  
  const highlightColors = [
    '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff9900', '#ff0080', '#80ff00', '#0080ff'
  ];



  // Update word count
  const updateWordCount = () => {
    if (editorRef.current) {
      const text = editorRef.current.textContent || '';
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      setWordCount(words.length);
    }
  };

  // Update active formatting states
  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough')
    });
  };

  // Handle content changes
  const handleContentChange = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const markdown = htmlToMarkdown(html);
      onChange(markdown);
      updateWordCount();
      updateActiveFormats();
    }
  };

  // Store cursor position
  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editorRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      return preCaretRange.toString().length;
    }
    return 0;
  };

  // Restore cursor position
  const restoreCursorPosition = (position: number) => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection) return;

    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentPosition = 0;
    let node;
    
    while (node = walker.nextNode()) {
      const textLength = node.textContent?.length || 0;
      if (currentPosition + textLength >= position) {
        const range = document.createRange();
        range.setStart(node, position - currentPosition);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      currentPosition += textLength;
    }
  };

  // Handle input without disrupting cursor
  const handleInput = () => {
    // Update word count only
    updateWordCount();
    
    // Debounced content update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        onChange(html);
      }
    }, 500);
  };

  // Save content on blur
  const handleBlur = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  // Execute formatting commands
  const execCommand = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      
      // Update content after formatting
      setTimeout(() => {
        if (editorRef.current) {
          const html = editorRef.current.innerHTML;
          onChange(html);
          updateWordCount();
          updateActiveFormats();
        }
      }, 10);
    }
  };

  // Handle font family change
  const handleFontChange = (font: string) => {
    setSelectedFont(font);
    execCommand('fontName', font);
  };

  // Handle font size change
  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    execCommand('fontSize', '7');
    // Apply custom font size to newly created font elements
    setTimeout(() => {
      const fontElements = document.getElementsByTagName('font');
      for (let i = fontElements.length - 1; i >= 0; i--) {
        if (fontElements[i].size === '7') {
          fontElements[i].removeAttribute('size');
          (fontElements[i] as HTMLElement).style.fontSize = size;
        }
      }
    }, 0);
  };

  // Handle color changes
  const handleTextColorChange = (color: string) => {
    execCommand('foreColor', color);
    setShowColorPicker(false);
  };

  const handleHighlightColorChange = (color: string) => {
    execCommand('backColor', color);
    setShowHighlightPicker(false);
  };

  // Handle link insertion
  const handleInsertLink = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    setLinkText(selectedText);
    setLinkUrl('');
    setShowLinkDialog(true);
  };

  // Insert link
  const insertLink = () => {
    const text = linkText || linkUrl;
    const url = linkUrl;
    
    if (url) {
      const link = `<a href="${url}" target="_blank">${text}</a>`;
      execCommand('insertHTML', link);
    }
    
    setShowLinkDialog(false);
    setLinkText('');
    setLinkUrl('');
  };

  // Track if content is being updated internally
  const isInternalUpdateRef = useRef(false);
  const lastValueRef = useRef(value);

  // Initialize editor with content only once
  useEffect(() => {
    if (editorRef.current && value && !lastValueRef.current) {
      editorRef.current.innerHTML = value;
      
      // Ensure proper text direction after content load
      editorRef.current.style.direction = 'ltr';
      editorRef.current.style.textAlign = 'left';
      
      updateWordCount();
      lastValueRef.current = value;
    }
  }, []);

  // Initialize content only when empty
  useEffect(() => {
    if (editorRef.current && value && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
      editorRef.current.style.direction = 'ltr';
      editorRef.current.style.textAlign = 'left';
      updateWordCount();
    }
  }, [value]);

  // Keyboard shortcuts and click outside handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            execCommand('bold');
            break;
          case 'i':
            e.preventDefault();
            execCommand('italic');
            break;
          case 'u':
            e.preventDefault();
            execCommand('underline');
            break;
          case 'z':
            e.preventDefault();
            execCommand('undo');
            break;
          case 'y':
            e.preventDefault();
            execCommand('redo');
            break;
          case 's':
            e.preventDefault();
            onSave?.();
            break;
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.color-picker-container')) {
        setShowColorPicker(false);
        setShowHighlightPicker(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onSave]);

  // Convert markdown to HTML for display
  const markdownToHtml = (markdown: string) => {
    return markdown
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
      .replace(/~~(.*?)~~/g, '<s>$1</s>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\n\n/g, '<div><br></div>')  // Double newlines become paragraph breaks
      .replace(/\n/g, '<br>');  // Single newlines become line breaks
  };

  // Convert HTML content back to markdown
  const htmlToMarkdown = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const processNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const children = Array.from(element.childNodes).map(processNode).join('');
        
        switch (element.tagName?.toLowerCase()) {
          case 'h1':
            return `# ${children}\n\n`;
          case 'h2':
            return `## ${children}\n\n`;
          case 'h3':
            return `### ${children}\n\n`;
          case 'strong':
          case 'b':
            return `**${children}**`;
          case 'em':
          case 'i':
            return `*${children}*`;
          case 'u':
            return `<u>${children}</u>`;
          case 's':
          case 'strike':
            return `~~${children}~~`;
          case 'a':
            const href = (element as HTMLAnchorElement).href;
            return `[${children}](${href})`;
          case 'ul':
            return children;
          case 'ol':
            return children;
          case 'li':
            return `- ${children}\n`;
          case 'p':
            return `${children}\n\n`;
          case 'div':
            return `${children}\n`;
          case 'br':
            return '\n';
          default:
            return children;
        }
      }
      
      return '';
    };
    
    return processNode(tempDiv).trim();
  };


  const formatActions = [
    {
      icon: Bold,
      action: () => {
        document.execCommand('bold');
        handleContentChange();
      },
      tooltip: 'Bold'
    },
    {
      icon: Italic,
      action: () => {
        document.execCommand('italic');
        handleContentChange();
      },
      tooltip: 'Italic'
    },
    {
      icon: Underline,
      action: () => {
        document.execCommand('underline');
        handleContentChange();
      },
      tooltip: 'Underline'
    },
    {
      icon: Strikethrough,
      action: () => {
        document.execCommand('strikeThrough');
        handleContentChange();
      },
      tooltip: 'Strikethrough'
    }
  ];

  const alignmentActions = [
    {
      icon: AlignLeft,
      action: () => {
        document.execCommand('justifyLeft');
        handleContentChange();
      },
      tooltip: 'Align Left'
    },
    {
      icon: AlignCenter,
      action: () => {
        document.execCommand('justifyCenter');
        handleContentChange();
      },
      tooltip: 'Align Center'
    },
    {
      icon: AlignRight,
      action: () => {
        document.execCommand('justifyRight');
        handleContentChange();
      },
      tooltip: 'Align Right'
    }
  ];

  const listActions = [
    {
      icon: List,
      action: () => {
        document.execCommand('insertUnorderedList');
        handleContentChange();
      },
      tooltip: 'Bullet List'
    },
    {
      icon: ListOrdered,
      action: () => {
        document.execCommand('insertOrderedList');
        handleContentChange();
      },
      tooltip: 'Numbered List'
    }
  ];


  const handleFormatChange = (format: string) => {
    setSelectedFormat(format);
    switch (format) {
      case 'heading1':
        document.execCommand('formatBlock', false, 'h1');
        handleContentChange();
        break;
      case 'heading2':
        document.execCommand('formatBlock', false, 'h2');
        handleContentChange();
        break;
      case 'heading3':
        document.execCommand('formatBlock', false, 'h3');
        handleContentChange();
        break;
      case 'paragraph':
        document.execCommand('formatBlock', false, 'p');
        handleContentChange();
        break;
    }
  };

  return (
    <div className={cn("h-screen flex flex-col bg-background overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="border-b bg-muted/20 p-3 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Format Dropdown */}
          <Select value={selectedFormat} onValueChange={handleFormatChange}>
            <SelectTrigger className="w-24 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">Normal</SelectItem>
              <SelectItem value="heading1">Heading 1</SelectItem>
              <SelectItem value="heading2">Heading 2</SelectItem>
              <SelectItem value="heading3">Heading 3</SelectItem>
            </SelectContent>
          </Select>

          {/* Font Dropdown */}
          <Select value={selectedFont} onValueChange={handleFontChange}>
            <SelectTrigger className="w-20 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Arial">Arial</SelectItem>
              <SelectItem value="Times">Times</SelectItem>
              <SelectItem value="Courier">Courier</SelectItem>
              <SelectItem value="Verdana">Verdana</SelectItem>
              <SelectItem value="Monospace">Monospace (Fixed Width)</SelectItem>
            </SelectContent>
          </Select>

          {/* Size Dropdown */}
          <Select value={selectedSize} onValueChange={handleSizeChange}>
            <SelectTrigger className="w-16 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="14">14</SelectItem>
              <SelectItem value="16">16</SelectItem>
              <SelectItem value="18">18</SelectItem>
              <SelectItem value="20">20</SelectItem>
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Text Formatting */}
          {formatActions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={action.action}
              title={action.tooltip}
            >
              <action.icon className="h-4 w-4" />
            </Button>
          ))}

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Alignment */}
          {alignmentActions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={action.action}
              title={action.tooltip}
            >
              <action.icon className="h-4 w-4" />
            </Button>
          ))}

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Lists */}
          {listActions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={action.action}
              title={action.tooltip}
            >
              <action.icon className="h-4 w-4" />
            </Button>
          ))}

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Insert Elements */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleInsertLink}
            title="Insert Link"
          >
            <Link className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => execCommand('unlink')}
            title="Remove Link"
          >
            <Unlink className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Color Pickers */}
          <div className="relative color-picker-container">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="Text Color"
            >
              <Palette className="h-4 w-4" />
            </Button>
            {showColorPicker && (
              <div className="absolute top-10 left-0 z-50 bg-white border rounded-lg shadow-lg p-2">
                <div className="grid grid-cols-8 gap-1">
                  {textColors.map((color) => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => handleTextColorChange(color)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative color-picker-container">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowHighlightPicker(!showHighlightPicker)}
              title="Highlight Color"
            >
              <Highlighter className="h-4 w-4" />
            </Button>
            {showHighlightPicker && (
              <div className="absolute top-10 left-0 z-50 bg-white border rounded-lg shadow-lg p-2">
                <div className="grid grid-cols-4 gap-1">
                  {highlightColors.map((color) => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => handleHighlightColorChange(color)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => execCommand('undo')}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => execCommand('redo')}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>

          <div className="flex-1" />
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative bg-white overflow-hidden border-2 border-gray-300 rounded-lg m-4 shadow-sm">
        {/* Inline styles to hide scrollbar but keep functionality */}
        <style dangerouslySetInnerHTML={{
          __html: `
            .editor-content::-webkit-scrollbar {
              display: none;
            }
            .editor-content {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `
        }} />
        <div 
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.ctrlKey || e.metaKey) {
              switch (e.key) {
                case 'b':
                  e.preventDefault();
                  execCommand('bold');
                  break;
                case 'i':
                  e.preventDefault();
                  execCommand('italic');
                  break;
                case 'u':
                  e.preventDefault();
                  execCommand('underline');
                  break;
              }
            }
          }}
          className={cn(
            "h-full w-full overflow-y-auto border-0 outline-none focus:ring-0 p-8 editor-content",
            "prose prose-lg max-w-none",
            "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
          )}
          dir="ltr"
          style={{
            fontFamily: selectedFont === 'Arial' ? 'Arial, sans-serif' : 
                       selectedFont === 'Times' ? 'Times New Roman, serif' :
                       selectedFont === 'Courier' ? 'Courier New, monospace' :
                       selectedFont === 'Verdana' ? 'Verdana, sans-serif' :
                       selectedFont === 'Monospace' ? 'Consolas, "Courier New", monospace' : 'Arial, sans-serif',
            fontSize: `${selectedSize}px`,
            lineHeight: '1.8',
            color: '#1f2937',
            direction: 'ltr',
            unicodeBidi: 'normal',
            writingMode: 'horizontal-tb',
            fontFeatureSettings: selectedFont === 'Monospace' ? '"tnum"' : 'normal',
            letterSpacing: selectedFont === 'Monospace' ? '0.05em' : 'normal',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            maxWidth: '80ch', // Fixed character width for consistent formatting
            margin: '0 auto', // Center the content horizontally
            textAlign: 'center' // Center align the text content
          }}
          data-placeholder={placeholder}
        />
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Link Text</label>
                <Input
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Enter link text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL</label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowLinkDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={insertLink}>
                Insert Link
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TextEditor;
