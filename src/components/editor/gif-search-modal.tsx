'use client';

import { Loader2, Search, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getTrendingGifs, searchGifs, type TenorGif } from '@/lib/tenor';
import { useGifModal } from '@/stores/gif-modal-store';

export const GifSearchModal = () => {
  const { isOpen, closeGifModal, quillInstance, selectionIndex, onGifSelect } = useGifModal();
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextPos, setNextPos] = useState<string | undefined>();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const currentQueryRef = useRef('');

  const loadGifs = useCallback(
    async (searchQuery: string, append = false) => {
      if (!append) {
        setLoading(true);
        currentQueryRef.current = searchQuery;
      }

      try {
        const data = searchQuery
          ? await searchGifs(searchQuery, append ? nextPos : undefined)
          : await getTrendingGifs();

        if (currentQueryRef.current === searchQuery) {
          if (append) {
            setGifs((prev) => {
              const existingIds = new Set(prev.map((g) => g.id));
              const newGifs = data.results.filter((gif: TenorGif) => !existingIds.has(gif.id));
              return [...prev, ...newGifs];
            });
          } else {
            // Remove duplicates from initial load
            const uniqueGifs = data.results.filter(
              (gif: TenorGif, index: number, self: TenorGif[]) =>
                index === self.findIndex((g) => g.id === gif.id),
            );
            setGifs(uniqueGifs);
          }
          setNextPos(data.next);
        }
      } finally {
        if (currentQueryRef.current === searchQuery) {
          setLoading(false);
        }
      }
    },
    [nextPos],
  );

  const debouncedSearch = useDebouncedCallback((searchQuery: string) => {
    loadGifs(searchQuery);
  }, 300);

  useEffect(() => {
    if (isOpen) {
      if (!query) {
        loadGifs('');
      } else {
        debouncedSearch(query);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, query]);

  const insertGif = useCallback(
    (gif: TenorGif) => {
      // If we have a callback for handling GIF selection, use it
      if (onGifSelect) {
        onGifSelect(gif);
      } else if (quillInstance && selectionIndex !== null) {
        // Fallback to old behavior if no callback provided
        quillInstance.insertEmbed(selectionIndex, 'image', gif.media_formats.gif.url);
        quillInstance.setSelection(selectionIndex + 1);
      }

      closeGifModal();
      setQuery('');
    },
    [quillInstance, selectionIndex, closeGifModal, onGifSelect],
  );

  useEffect(() => {
    if (!loadMoreRef.current || loading || !nextPos) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadGifs(currentQueryRef.current, true);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [loading, nextPos, loadGifs]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeGifModal()}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            {query ? <Search className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            {query ? 'Search GIFs' : 'Trending GIFs'}
          </DialogTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for GIFs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </DialogHeader>

        <ScrollArea className="h-[450px] px-6 pb-6">
          {loading && gifs.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : gifs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No GIFs found. Try a different search.
            </div>
          ) : (
            <>
              <div className="columns-3 gap-2" style={{ columnFill: 'balance' }}>
                {gifs.map((gif, index) => {
                  const aspectRatio = gif.media_formats.tinygif.dims
                    ? gif.media_formats.tinygif.dims[1] / gif.media_formats.tinygif.dims[0]
                    : 1;
                  const height = Math.round(200 * aspectRatio);

                  return (
                    <button
                      key={`${gif.id}-${index}`}
                      onClick={() => insertGif(gif)}
                      className="relative mb-2 block w-full overflow-hidden rounded-lg cursor-pointer bg-muted/20 hover:opacity-90 transition-opacity"
                      aria-label={gif.content_description || gif.title}
                      style={{
                        breakInside: 'avoid',
                        height: `${height}px`,
                      }}
                    >
                      <Image
                        src={gif.media_formats.tinygif.url}
                        alt={gif.content_description || gif.title}
                        fill
                        sizes="(max-width: 768px) 33vw, 200px"
                        className="object-cover"
                        loading="lazy"
                        unoptimized
                      />
                    </button>
                  );
                })}
              </div>
              {nextPos && (
                <div ref={loadMoreRef} className="flex justify-center py-4">
                  {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
