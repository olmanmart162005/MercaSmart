import React, { useEffect, useState } from 'react'

interface SplashScreenProps {
  onFinish: () => void
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Progresión de la barra de carga
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 2
      })
    }, 40)

    // Iniciar fade out a los 2 segundos
    const fadeTimer = setTimeout(() => {
      setFadeOut(true)
    }, 2000)

    // Llamar onFinish después de la animación de salida
    const finishTimer = setTimeout(() => {
      onFinish()
    }, 2600)

    return () => {
      clearInterval(interval)
      clearTimeout(fadeTimer)
      clearTimeout(finishTimer)
    }
  }, [onFinish])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Fondo degradado */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 opacity-80" />

      {/* Círculos decorativos */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />

      {/* Contenido centrado */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-8">
        {/* Logo con animación */}
        <div
          className="flex flex-col items-center gap-4"
          style={{
            animation: 'splashFadeIn 0.8s ease-out forwards',
          }}
        >
          {/* Logo imagen */}
          <div className="relative">
            <div className="absolute inset-0 bg-sky-500/20 rounded-3xl blur-xl scale-110" />
            <img
              src="/logo.png"
              alt="MercaSmart"
              className="relative w-24 h-24 object-contain drop-shadow-2xl"
              onError={(e) => {
                // Fallback si no carga la imagen
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>

          {/* Nombre de la app */}
          <div className="text-center">
            <h1 className="text-4xl font-black text-white tracking-tight">
              Merca<span className="text-sky-400">Smart</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium mt-1 tracking-widest uppercase">
              Sistema de Punto de Venta
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div
          className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden"
          style={{
            animation: 'splashFadeIn 1s ease-out 0.3s both',
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Versión */}
        <p
          className="text-slate-600 text-xs"
          style={{
            animation: 'splashFadeIn 1s ease-out 0.6s both',
          }}
        >
          v2.0 • Honduras
        </p>
      </div>

      {/* Animación CSS */}
      <style>{`
        @keyframes splashFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
