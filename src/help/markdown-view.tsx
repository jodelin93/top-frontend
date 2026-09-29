'use client';

import { Fragment, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, Info, Lightbulb, X, ZoomIn } from 'lucide-react';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';
import { FALLBACK_LANGS, shotUrl } from './load';
import type { HelpBlock, HelpInline } from './types';

/**
 * Renders a compiled help topic. Content is data (a block tree), never HTML: text is
 * escaped by React, links only go to other topics, app pages or http(s) URLs.
 */
interface ViewProps {
  blocks: HelpBlock[];
  /** Language of the topic text (its screenshots are looked up in it first) */
  lang: string;
  onOpenTopic: (topicId: string) => void;
  /** Called when a link leaves the help (to an app page), e.g. to close the drawer */
  onLeave?: () => void;
}

export function MarkdownView({ blocks, lang, onOpenTopic, onLeave }: ViewProps) {
  const [zoom, setZoom] = useState<{ shot: string; alt: string } | null>(null);
  const ctx: RenderContext = { lang, onOpenTopic, onLeave, onZoom: setZoom };
  return (
    <div className="help-content space-y-3 text-[15px] leading-relaxed text-gray-800">
      {blocks.map((block, i) => (
        <Block key={i} block={block} ctx={ctx} />
      ))}
      {zoom && <ZoomedShot shot={zoom.shot} alt={zoom.alt} lang={lang} onClose={() => setZoom(null)} />}
    </div>
  );
}

interface RenderContext {
  lang: string;
  onOpenTopic: (topicId: string) => void;
  onLeave?: () => void;
  onZoom: (shot: { shot: string; alt: string }) => void;
}

function Block({ block, ctx }: { block: HelpBlock; ctx: RenderContext }) {
  switch (block.t) {
    case 'h': {
      const content = <Inlines nodes={block.c} ctx={ctx} />;
      if (block.level <= 2) return <h3 id={block.id} className="pt-3 text-lg font-semibold text-gray-900">{content}</h3>;
      if (block.level === 3) return <h4 id={block.id} className="pt-2 text-base font-semibold text-gray-900">{content}</h4>;
      return <h5 id={block.id} className="pt-1 font-semibold text-gray-900">{content}</h5>;
    }
    case 'p':
      return (
        <p>
          <Inlines nodes={block.c} ctx={ctx} />
        </p>
      );
    case 'ol':
      return (
        <ol start={block.start} className="list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-blue-700">
          {block.items.map((item, i) => (
            <li key={i} className="pl-1">
              <Inlines nodes={item} ctx={ctx} />
            </li>
          ))}
        </ol>
      );
    case 'ul':
      return (
        <ul className="list-disc space-y-1.5 pl-6 marker:text-gray-400">
          {block.items.map((item, i) => (
            <li key={i} className="pl-1">
              <Inlines nodes={item} ctx={ctx} />
            </li>
          ))}
        </ul>
      );
    case 'quote': {
      const Icon = block.kind === 'warning' ? AlertTriangle : block.kind === 'tip' ? Lightbulb : Info;
      return (
        <div
          className={cn(
            'flex gap-2.5 rounded-md border p-3 text-sm',
            block.kind === 'warning' && 'border-amber-300 bg-amber-50 text-amber-950',
            block.kind === 'tip' && 'border-blue-200 bg-blue-50 text-blue-950',
            block.kind === 'note' && 'border-gray-200 bg-gray-50'
          )}
        >
          <Icon
            aria-hidden
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0',
              block.kind === 'warning' ? 'text-amber-600' : block.kind === 'tip' ? 'text-blue-600' : 'text-gray-500'
            )}
          />
          <div className="min-w-0 space-y-2">
            {block.c.map((inner, i) => (
              <Block key={i} block={inner} ctx={ctx} />
            ))}
          </div>
        </div>
      );
    }
    case 'table':
      return (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                {block.head.map((cell, i) => (
                  <th key={i} className="border-b px-3 py-2 font-semibold text-gray-700">
                    <Inlines nodes={cell} ctx={ctx} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-b last:border-0 align-top">
                  {row.map((cell, i) => (
                    <td key={i} className="px-3 py-2">
                      <Inlines nodes={cell} ctx={ctx} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'img':
      return (
        <figure className="space-y-1">
          <button
            type="button"
            onClick={() => ctx.onZoom({ shot: block.shot, alt: block.alt })}
            className="group relative block w-full overflow-hidden rounded-md border bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={t('Enlarge the picture: {alt}', { alt: block.alt })}
          >
            <Shot key={`${ctx.lang}:${block.shot}`} shot={block.shot} alt={block.alt} lang={ctx.lang} className="w-full" />
            <span className="absolute right-2 top-2 rounded bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <ZoomIn className="h-4 w-4" aria-hidden />
            </span>
          </button>
          {block.alt && <figcaption className="text-xs text-gray-500">{block.alt}</figcaption>}
        </figure>
      );
    case 'hr':
      return <hr className="my-2" />;
    case 'code':
      return <pre className="overflow-x-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">{block.text}</pre>;
    default:
      return null;
  }
}

function Inlines({ nodes, ctx }: { nodes: HelpInline[]; ctx: RenderContext }) {
  return (
    <>
      {nodes.map((node, i) => (
        <Fragment key={i}>{renderInline(node, ctx)}</Fragment>
      ))}
    </>
  );
}

function renderInline(node: HelpInline, ctx: RenderContext): ReactNode {
  if (typeof node === 'string') return node;
  if ('code' in node) return <code className="rounded bg-gray-100 px-1 py-0.5 text-[0.9em]">{node.code}</code>;
  if ('img' in node) return <Shot shot={node.img} alt={node.alt} lang={ctx.lang} className="inline h-5 align-text-bottom" />;
  if ('a' in node) return <HelpLink href={node.a} ctx={ctx}><Inlines nodes={node.c} ctx={ctx} /></HelpLink>;
  if (node.t === 'b') return <strong className="font-semibold text-gray-900"><Inlines nodes={node.c} ctx={ctx} /></strong>;
  return <em><Inlines nodes={node.c} ctx={ctx} /></em>;
}

const LINK = 'font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:decoration-blue-700';

function HelpLink({ href, ctx, children }: { href: string; ctx: RenderContext; children: ReactNode }) {
  if (href.startsWith('topic:')) {
    const id = href.slice('topic:'.length);
    return (
      <button type="button" className={LINK} onClick={() => ctx.onOpenTopic(id)}>
        {children}
      </button>
    );
  }
  if (href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link href={href} className={LINK} onClick={() => ctx.onLeave?.()}>
        {children}
      </Link>
    );
  }
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} className={LINK} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  // Anything else (javascript:, data:...) is shown as plain text
  return <>{children}</>;
}

/**
 * A screenshot, lazy-loaded. When it does not exist in the topic language yet, the
 * English then French picture is used.
 */
export function Shot({ shot, alt, lang, className }: { shot: string; alt: string; lang: string; className?: string }) {
  const candidates = [lang, ...FALLBACK_LANGS.filter((l) => l !== lang)];
  const [attempt, setAttempt] = useState(0);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(shot)) return null;
  if (attempt >= candidates.length) {
    return <span className="block p-6 text-center text-xs text-gray-400">{alt}</span>;
  }
  return (
    // Plain <img>: static files of any size, lazy-loaded; next/image adds nothing here
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={shotUrl(candidates[attempt], shot)}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setAttempt((n) => n + 1)}
    />
  );
}

function ZoomedShot({ shot, alt, lang, onClose }: { shot: string; alt: string; lang: string; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      data-help-zoom=""
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-2 sm:p-6"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <button
        type="button"
        autoFocus
        onClick={onClose}
        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-800"
        aria-label={t('Close the picture')}
      >
        <X className="h-5 w-5" />
      </button>
      <Shot shot={shot} alt={alt} lang={lang} className="max-h-full max-w-full rounded bg-white object-contain shadow-2xl" />
    </div>
  );
}
