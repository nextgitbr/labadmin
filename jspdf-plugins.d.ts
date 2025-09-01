declare module 'jspdf' {
  export class jsPDF {
    constructor(options?: any);
    setFont(fontName?: string, fontStyle?: string): void;
    setFontSize(size: number): void;
    setTextColor(r: number, g?: number, b?: number): void;
    text(txt: string, x: number, y: number): void;
    addPage(format?: any, orientation?: any): void;
    save(filename?: string): void;
    // plugin hook - added by jspdf-autotable
    autoTable?: (options: any) => void;
    // last table info - provided by jspdf-autotable
    lastAutoTable?: { finalY: number };
  }
}

declare module 'jspdf-autotable' {
  const plugin: any;
  export default plugin;
}
