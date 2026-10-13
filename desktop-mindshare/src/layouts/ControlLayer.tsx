import { cn, onCloseApp } from '@/lib/utils'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { X } from 'lucide-react'
import React, { useEffect, useState } from 'react'

type Props = {
    children: React.ReactNode
    className?: string
}

const ControlLayer = ({ children, className }: Props) => {
    const [isVisible, setIsVisible] = useState<boolean>(false)

    // Register once (and clean up) instead of adding a new listener on every render.
    useEffect(() => {
        const handler = (_event: unknown, payload: { state: boolean }) => {
            setIsVisible(payload.state)
        }
        window.ipcRenderer?.on('hide-plugin', handler as any)
        return () => {
            window.ipcRenderer?.off('hide-plugin', handler as any)
        }
    }, [])

    return (
        <div
            className={cn(
                className,
                isVisible && 'invisible',
                'bg-[#171717] border-2 border-neutral-700 flex px-2 flex-col rounded-3xl overflow-hidden h-screen w-full select-none shadow-2xl'
            )}
        >
            <div className="flex justify-between items-center p-4 draggable">
                <span className="non-draggable">
                    <SignedIn>
                        <UserButton />
                    </SignedIn>
                    <SignedOut>
                        <SignInButton mode="modal">
                            <div className="w-8 h-8 rounded-full bg-[#e11d48] text-white flex items-center justify-center font-bold text-sm shadow cursor-pointer hover:opacity-90">
                                A
                            </div>
                        </SignInButton>
                    </SignedOut>
                </span>
                <X
                    size={20}
                    className="text-gray-400 non-draggable hover:text-white cursor-pointer"
                    onClick={onCloseApp}
                />
            </div>
            <div className="flex-1 flex flex-col justify-center overflow-auto">{children}</div>
            <div className="p-4 flex w-full">
                <div className="flex items-center gap-x-2">
                    <img src="/clipsphere-logo.svg" alt="ClipSphere logo" className="w-6 h-6" onError={(e)=>{ (e.target as HTMLElement).style.display = 'none'; }} />
                    <p className="text-white text-xl font-bold tracking-tight">ClipSphere</p>
                </div>
            </div>
        </div>
    )
}

export default ControlLayer
