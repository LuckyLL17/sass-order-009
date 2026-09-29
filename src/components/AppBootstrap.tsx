import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import App from '@/App';

/** 应用引导：启动时拉取工具数据，并在 token 存在时恢复登录态（刷新后数据保留） */
export default function AppBootstrap() {
  const bootstrap = useStore((s) => s.bootstrap);
  const bootstrapped = useStore((s) => s.bootstrapped);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    bootstrap().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [bootstrap]);

  if (!ready || !bootstrapped) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center animate-pulse">
            <span className="text-white text-2xl font-bold">S</span>
          </div>
          <p className="text-gray-400 text-sm">正在加载 SubHub…</p>
        </div>
      </div>
    );
  }

  return <App />;
}
