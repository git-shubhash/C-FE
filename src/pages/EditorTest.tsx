import React, { useState } from 'react';
import { TextEditor } from '@/components/ui/TextEditor';

const EditorTest: React.FC = () => {
  const [content, setContent] = useState('# Welcome to the WYSIWYG Editor\n\nThis is a **bold** text and this is *italic* text.\n\n- First bullet point\n- Second bullet point\n\nYou can [visit our website](https://example.com) for more information.');

  const handleSave = () => {
    console.log('Saving content:', content);
    alert('Content saved!');
  };

  const handleCancel = () => {
    console.log('Cancelled editing');
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">WYSIWYG Editor Test</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Current Markdown Content:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-40">
          {content}
        </pre>
      </div>

      <TextEditor
        value={content}
        onChange={setContent}
        placeholder="Start typing your document here..."
        onSave={handleSave}
        onCancel={handleCancel}
        className="w-full"
      />
    </div>
  );
};

export default EditorTest;
