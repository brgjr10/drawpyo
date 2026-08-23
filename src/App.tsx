import { ThemeProvider } from './components/ThemeProvider'
import { Header } from './components/Header'
import { Homepage } from './components/Homepage'
import { Canvas } from './components/Canvas'
import { Sidebar } from './components/Sidebar'
import { useAppStore } from './store'

const AppContent = () => {
  const project = useAppStore((s) => s.project)

  if (!project) {
    return <Homepage />
  }

  return (
    <>
      <Header />
      <div className="main-content">
        <Canvas />
        <Sidebar />
      </div>
    </>
  )
}

const App = () => (
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
)

export default App
