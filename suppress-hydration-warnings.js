// Suprimir warnings de hidratação causados por extensões do navegador
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (
        args[0].includes('Warning: Prop') ||
        args[0].includes('Warning: Extra attributes') ||
        args[0].includes('__gchrome_uniqueid') ||
        args[0].includes('hydrated but some attributes') ||
        args[0].includes('server rendered HTML didn\'t match')
      )
    ) {
      // Suprimir warnings relacionados a extensões do browser
      return;
    }
    originalError.apply(console, args);
  };
}
