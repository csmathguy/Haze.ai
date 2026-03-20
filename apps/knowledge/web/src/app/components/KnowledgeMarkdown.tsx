import { useEffect, useId, useRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import { Box, Paper, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

mermaid.initialize({
  startOnLoad: false,
  theme: "default"
});

export function KnowledgeMarkdown({ content }: { readonly content: string }) {
  return (
    <ReactMarkdown
      components={{
        code: CodeBlock,
        h1: ({ children }) => <Typography variant="h2">{children}</Typography>,
        h2: ({ children }) => <Typography variant="h3">{children}</Typography>,
        p: ({ children }) => <Typography variant="body2">{children}</Typography>,
        ul: ({ children }) => (
          <Box component="ul" sx={{ pl: 3 }}>
            {children}
          </Box>
        ),
        li: ({ children }) => (
          <Typography component="li" variant="body2">
            {children}
          </Typography>
        )
      }}
      remarkPlugins={[remarkGfm]}
    >
      {content}
    </ReactMarkdown>
  );
}

function CodeBlock({ className, children }: Readonly<ComponentPropsWithoutRef<"code">>) {
  const match = /language-(\w+)/.exec(className ?? "");
  const language = match?.[1];
  let code = "";

  if (typeof children === "string") {
    code = children;
  } else if (Array.isArray(children)) {
    code = children.join("");
  }

  if (language === "mermaid") {
    return <MermaidDiagram code={code} />;
  }

  return <Pre>{code}</Pre>;
}

function MermaidDiagram({ code }: { readonly code: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const errorRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    void mermaid
      .render(`mermaid-${id}`, code)
      .then(({ svg: nextSvg }) => {
        if (active) {
          setSvg(nextSvg);
        }
      })
      .catch((error: unknown) => {
        errorRef.current = error instanceof Error ? error.message : "Failed to render diagram.";
        if (active) {
          setSvg(null);
        }
      });

    return () => {
      active = false;
    };
  }, [code, id]);

  if (svg !== null) {
    return <DiagramSurface dangerouslySetInnerHTML={{ __html: svg }} />;
  }

  return (
    <Paper sx={{ p: 1.5 }}>
      <Typography color="text.secondary" variant="body2">
        {errorRef.current ?? "Rendering diagram..."}
      </Typography>
      <Pre>{code}</Pre>
    </Paper>
  );
}

const Pre = styled("pre")(({ theme }) => ({
  backgroundColor: "var(--mui-palette-background-default)",
  borderRadius: Number(theme.shape.borderRadius) * 0.85,
  fontFamily: theme.typography.fontFamily,
  margin: 0,
  overflowX: "auto",
  padding: theme.spacing(1.5),
  whiteSpace: "pre-wrap"
}));

const DiagramSurface = styled(Box)(({ theme }) => ({
  "& svg": {
    height: "auto",
    maxWidth: "100%"
  },
  backgroundColor: "var(--mui-palette-background-paper)",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: Number(theme.shape.borderRadius) * 0.85,
  overflow: "auto",
  padding: theme.spacing(1.5)
}));
