import type Quill from 'quill';
import { create } from 'zustand';
import type { TenorGif } from '@/lib/tenor';

interface GifModalStore {
  isOpen: boolean;
  quillInstance: Quill | null;
  selectionIndex: number | null;
  onGifSelect: ((gif: TenorGif) => void) | null;
  openGifModal: (
    quill: Quill,
    selectionIndex: number,
    onGifSelect?: (gif: TenorGif) => void,
  ) => void;
  closeGifModal: () => void;
}

export const useGifModal = create<GifModalStore>((set) => ({
  isOpen: false,
  quillInstance: null,
  selectionIndex: null,
  onGifSelect: null,
  openGifModal: (quill, selectionIndex, onGifSelect) =>
    set({
      isOpen: true,
      quillInstance: quill,
      selectionIndex,
      onGifSelect: onGifSelect || null,
    }),
  closeGifModal: () =>
    set({
      isOpen: false,
      quillInstance: null,
      selectionIndex: null,
      onGifSelect: null,
    }),
}));
