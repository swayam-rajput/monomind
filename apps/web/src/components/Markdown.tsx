import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


function Markdown({ content }: { content: string }) {
    return (
        <div className="
      text-[13px] leading-6
      text-foreground/90
      [&>p]:mb-3
      [&>p:last-child]:mb-0
    ">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }) => (
                        <p className="mb-3 last:mb-0">{children}</p>
                    ),

                    strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">
                            {children}
                        </strong>
                    ),

                    em: ({ children }) => (
                        <em className="text-foreground/90">{children}</em>
                    ),

                    h1: ({ children }) => (
                        <h1 className="mb-3 text-base font-semibold text-foreground">
                            {children}
                        </h1>
                    ),

                    h2: ({ children }) => (
                        <h2 className="mb-2.5 text-[15px] font-semibold text-foreground">
                            {children}
                        </h2>
                    ),

                    h3: ({ children }) => (
                        <h3 className="mb-2 text-sm font-semibold text-foreground">
                            {children}
                        </h3>
                    ),

                    ul: ({ children }) => (
                        <ul className="mb-3 list-disc space-y-1 pl-5">
                            {children}
                        </ul>
                    ),

                    ol: ({ children }) => (
                        <ol className="mb-3 list-decimal space-y-1 pl-5">
                            {children}
                        </ol>
                    ),

                    li: ({ children }) => (
                        <li className="pl-0.5">{children}</li>
                    ),

                    pre: ({ children }) => (
                        <pre className="
              my-3 overflow-x-auto
              rounded-lg border border-border/60
              bg-muted/70 p-3
              text-[12px] leading-5
            ">
                            {children}
                        </pre>
                    ),

                    code: ({ children, className }) =>
                        className ? (
                            <code className={`${className} font-mono`}>
                                {children}
                            </code>
                        ) : (
                            <code className="
                rounded bg-muted
                px-1.5 py-0.5
                font-mono text-[0.9em]
                text-foreground
              ">
                                {children}
                            </code>
                        ),

                    blockquote: ({ children }) => (
                        <blockquote className="
              my-3 border-l-2
              border-border pl-4
              text-muted-foreground
            ">
                            {children}
                        </blockquote>
                    ),

                    hr: () => (
                        <hr className="my-4 border-border/60" />
                    ),

                    a: ({ children, href }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                text-primary
                underline underline-offset-2
                decoration-primary/40
                hover:decoration-primary
              "
                        >
                            {children}
                        </a>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

export default Markdown;