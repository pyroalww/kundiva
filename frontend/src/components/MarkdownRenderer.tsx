import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

type MarkdownRendererProps = {
  content: string;
  className?: string;
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={`markdown-body ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Override elements for better styling
          table: ({ children, ...props }) => (
            <div className="table-wrapper">
              <table {...props}>{children}</table>
            </div>
          ),
          code: ({ children, className: codeClassName, ...props }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return <code className="inline-code" {...props}>{children}</code>;
            }
            return (
              <pre className="code-block">
                <code className={codeClassName} {...props}>{children}</code>
              </pre>
            );
          },
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>
          ),
          img: ({ ...props }) => (
            <img {...props} style={{ maxWidth: '100%', borderRadius: '8px' }} loading="lazy" />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
