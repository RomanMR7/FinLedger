import "./globals.css";
import Link from "next/link";
export const metadata={title:"Финансовый учёт",description:"Локальный учёт операций"};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="ru"><body>
  <aside><h1>FinLedger</h1>
   <Link href="/">Дашборд</Link>
   <Link href="/operations">Операции</Link>
   <Link href="/calculator">Калькулятор</Link>
   <Link href="/requisites">Реквизиты</Link>
   <Link href="/tasks">Задачи</Link>
   <Link href="/reports">Отчёты</Link>
   <Link href="/settings">Тарифы и курсы</Link>
  </aside>
  <main>{children}</main>
 </body></html>;
}
