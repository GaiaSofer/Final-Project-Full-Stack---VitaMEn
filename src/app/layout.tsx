import './globals.css';
import type { ReactNode } from 'react';
import TopNav from '@/components/TopNav';

export const metadata = {
  title: 'VitaMEn — מעקב ובקרה על תוספי תזונה',
  description: 'עקוב אחר התוספים שאתה נוטל, קבל התראה לפני חריגה מהמנה היומית, והשווה מחירים בין מותגים.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <div className="disclaimer">
          המידע באתר הוא בהמלצה בלבד ואינו ייעוץ רפואי · מדובר בתוספי מזון ולא בתרופות
        </div>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
