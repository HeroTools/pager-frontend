class TabBadgeManager {
  private originalTitle: string = '';
  private unreadCount: number = 0;
  private isPageVisible: boolean = true;
  private isInitialized: boolean = false;

  constructor() {
    if (typeof document !== 'undefined') {
      this.init();
    }
  }

  private init() {
    try {
      this.originalTitle = document.title;
      this.isPageVisible = !document.hidden;
      this.setupVisibilityHandlers();
      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize tab badge manager:', error);
    }
  }

  private setupVisibilityHandlers() {
    if (typeof document === 'undefined') {
      return;
    }

    document.addEventListener('visibilitychange', () => {
      this.isPageVisible = !document.hidden;
      this.updateTitle();
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.isPageVisible = true;
        this.updateTitle();
      });

      window.addEventListener('blur', () => {
        this.isPageVisible = false;
      });
    }
  }

  setUnreadCount(count: number) {
    this.unreadCount = count;
    this.updateTitle();
  }

  private updateTitle() {
    if (!this.isInitialized || typeof document === 'undefined') {
      return;
    }

    try {
      if (this.unreadCount > 0 && !this.isPageVisible) {
        const countText = this.unreadCount > 99 ? '99+' : this.unreadCount.toString();
        // Remove existing count if present, then add new count
        const cleanTitle = this.originalTitle.replace(/^\(\d+\+?\)\s*/, '');
        document.title = `(${countText}) ${cleanTitle}`;
      } else {
        // Remove count from title
        document.title = this.originalTitle.replace(/^\(\d+\+?\)\s*/, '');
      }
    } catch (error) {
      console.warn('Failed to update document title:', error);
    }
  }

  clearBadge() {
    this.setUnreadCount(0);
  }
}

// Create singleton with lazy initialization
let tabBadgeManagerInstance: TabBadgeManager | null = null;

export const getTabBadgeManager = (): TabBadgeManager | null => {
  if (!tabBadgeManagerInstance && typeof document !== 'undefined') {
    tabBadgeManagerInstance = new TabBadgeManager();
  }
  return tabBadgeManagerInstance;
};

export const tabBadgeManager = {
  setUnreadCount: (count: number) => {
    const manager = getTabBadgeManager();
    if (manager) {
      manager.setUnreadCount(count);
    }
  },
  clearBadge: () => {
    const manager = getTabBadgeManager();
    if (manager) {
      manager.clearBadge();
    }
  },
};
