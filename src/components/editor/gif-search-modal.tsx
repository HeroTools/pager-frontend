'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, TrendingUp } from 'lucide-react';
import { useGifModal } from '@/stores/use-gif-modal';
import { getTrendingGifs, searchGifs, type TenorGif } from '@/lib/tenor';
import { cn } from '@/lib/utils';
import { useDebouncedCallback } from 'use-debounce';

export const GifSearchModal = () => {
  const { isOpen, closeGifModal, quillInstance, selectionIndex } = useGifModal();
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
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
            setGifs((prev) => [...prev, ...data.results]);
          } else {
            setGifs(data.results);
            setSelectedIndex(0);
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
      if (!quillInstance || selectionIndex === null) return;

      quillInstance.insertEmbed(selectionIndex, 'image', gif.media_formats.gif.url);
      quillInstance.setSelection(selectionIndex + 1);

      closeGifModal();
      setQuery('');
      setSelectedIndex(0);
    },
    [quillInstance, selectionIndex, closeGifModal],
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

  useEffect(() => {
    if (!isOpen || gifs.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const columns = 3;
      const total = gifs.length;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, total - 1));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + columns, total - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - columns, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (gifs[selectedIndex]) insertGif(gifs[selectedIndex]);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, gifs, selectedIndex, insertGif]);

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
              <div className="grid grid-cols-3 gap-2">
                {gifs.map((gif, index) => (
                  <button
                    key={gif.id}
                    onClick={() => insertGif(gif)}
                    className={cn(
                      'relative aspect-square overflow-hidden rounded-lg transition-all',
                      'hover:ring-2 hover:ring-primary hover:ring-offset-2',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                      index === selectedIndex && 'ring-2 ring-primary ring-offset-2',
                    )}
                    aria-label={gif.content_description || gif.title}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gif.media_formats.tinygif.url}
                      alt={gif.content_description || gif.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
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
