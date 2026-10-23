import { createContext, useContext } from 'react'

// Estado del menú lateral en móvil (abrir/cerrar desde la barra superior)
export const ShellContext = createContext({ navOpen: false, setNavOpen: () => {} })
export const useShell = () => useContext(ShellContext)
