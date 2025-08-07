import type Quill from 'quill';
import { create } from 'zustand';

interface GifModalStore {
  isOpen: boolean;
  quillInstance: Quill | null;
  selectionIndex: number | null;
  openGifModal: (quill: Quill, selectionIndex: number) => void;
  closeGifModal: () => void;
}

export const useGifModal = create<GifModalStore>((set) => ({
  isOpen: false,
  quillInstance: null,
  selectionIndex: null,
  openGifModal: (quill, selectionIndex) =>
    set({
      isOpen: true,
      quillInstance: quill,
      selectionIndex,
    }),
  closeGifModal: () =>
    set({
      isOpen: false,
      quillInstance: null,
      selectionIndex: null,
    }),
}));
