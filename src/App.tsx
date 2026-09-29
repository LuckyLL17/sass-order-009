import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Market from "@/pages/Market";
import ToolDetail from "@/pages/ToolDetail";
import Subscriptions from "@/pages/Subscriptions";
import Team from "@/pages/Team";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";
import { useStore } from "@/store/useStore";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const pageTransition = {
  duration: 0.4,
  ease: "easeOut"
};

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route 
          path="/" 
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Home />
            </motion.div>
          } 
        />
        <Route 
          path="/market" 
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Market />
            </motion.div>
          } 
        />
        <Route 
          path="/tool/:id" 
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <ToolDetail />
            </motion.div>
          } 
        />
        <Route 
          path="/subscriptions" 
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Subscriptions />
            </motion.div>
          } 
        />
        <Route 
          path="/team" 
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Team />
            </motion.div>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Profile />
            </motion.div>
          } 
        />
        <Route 
          path="/login" 
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Login />
            </motion.div>
          } 
        />
        <Route 
          path="/register" 
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Register />
            </motion.div>
          } 
        />
        <Route 
          path="*" 
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <NotFound />
            </motion.div>
          } 
        />
      </Routes>
    </AnimatePresence>
  );
}

function Layout() {
  const location = useLocation();
  const noLayoutRoutes = ['/login', '/register'];
  const showLayout = !noLayoutRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      {showLayout && <Navbar />}
      <main className={showLayout ? 'pt-20' : ''}>
        <AnimatedRoutes />
      </main>
      {showLayout && <Footer />}
    </div>
  );
}

function AppBootstrap({ children }: { children: React.ReactNode }) {
  const authReady = useStore((s) => s.authReady);
  const toolsLoading = useStore((s) => s.toolsLoading);
  const bootstrap = useStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // 首次加载工具目录 / 恢复登录会话时展示全局加载态
  if (!authReady || toolsLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center animate-pulse">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <p className="text-gray-400 text-sm">正在加载 SubHub...</p>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <AppBootstrap>
        <Layout />
      </AppBootstrap>
    </Router>
  );
}
