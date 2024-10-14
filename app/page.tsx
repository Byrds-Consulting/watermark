import Image from 'next/image'
import { App } from '@/app/App'

export default function Home() {
    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Background gradients */}
                <div className="absolute inset-0 overflow-hidden w-full h-full bg-gradient-to-br from-[#22ebf3] via-[#3CDC1E] to-[#c0de17] opacity-15" />
                <div className="absolute inset-0 overflow-hidden w-full h-full bg-gradient-to-b from-white/0 via-white/0 to-white/100" />
                {/* <div className="absolute inset-0 overflow-hidden w-full h-full bg-gradient-to-r from-white/0 via-white/50 to-white/100" /> */}
                {/* Background shapes */}
                <div className="absolute left-1/3 top-1/3 -translate-x-[65%] -translate-y-[65%] w-[500px] h-[500px] bg-[#22EBF3] opacity-15 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
                <div className="absolute left-1/3 top-1/3 -translate-x-[0%] -translate-y-[65%] w-[500px] h-[500px] bg-[#c0de17] opacity-15 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute left-1/3 top-1/3 -translate-x-[45%] -translate-y-[5%] w-[500px] h-[500px] bg-[#3CDC1E] opacity-15 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            </div>
            <div className="relative grid items-center justify-items-center min-h-screen gap-16 font-[family-name:var(--font-geist-sans)]">
                <App />
            </div>
        </div>
    )
}
