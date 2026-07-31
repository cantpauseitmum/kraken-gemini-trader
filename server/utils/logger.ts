export class Logger {
  private static formatTime(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  static info(component: string, message: string, meta?: any) {
    const time = this.formatTime();
    const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
    console.log(`[${time}] [INFO] [${component}] ${message}${metaStr}`);
  }

  static warn(component: string, message: string, meta?: any) {
    const time = this.formatTime();
    const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
    console.warn(`[${time}] [WARN] [${component}] ${message}${metaStr}`);
  }

  static error(component: string, message: string, meta?: any) {
    const time = this.formatTime();
    const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
    console.error(`[${time}] [ERROR] [${component}] ${message}${metaStr}`);
  }
}
