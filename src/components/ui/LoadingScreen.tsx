import { ShoppingCart } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-glow animate-pulse">
          <ShoppingCart className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">MercaSmart</h1>
          <p className="text-surface-400 text-sm mt-1">Cargando...</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
