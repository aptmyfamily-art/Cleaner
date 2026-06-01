import type { ReactNode } from 'react';

interface MainLayoutProps {
    children: ReactNode;
    leftSidebar: ReactNode;
    rightSidebar: ReactNode;
}

export function MainLayout({ children, leftSidebar, rightSidebar }: MainLayoutProps) {
    return (
        <div className="flex h-screen bg-neutral-900 text-white overflow-hidden">
            {/* Left Sidebar - Navigation */}
            <aside className="w-64 max-w-[20vw] min-w-[200px] flex-shrink-0 border-r border-neutral-800 bg-neutral-950 flex flex-col transition-all">
                {leftSidebar}
            </aside>

            {/* Center - Workspace */}
            <main className="flex-1 min-w-0 relative bg-neutral-900 overflow-hidden flex flex-col">
                {children}
            </main>

            {/* Right Sidebar - Inspector */}
            <aside className="w-80 max-w-[30vw] min-w-[250px] flex-shrink-0 border-l border-neutral-800 bg-neutral-950 flex flex-col transition-all">
                {rightSidebar}
            </aside>
        </div>
    );
}
