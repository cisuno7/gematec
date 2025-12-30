import ResponsiveContainer, { ResponsiveContainerProps } from './ResponsiveContainer';

/**
 * Camada de compatibilidade.
 *
 * O app está migrando para `ResponsiveContainer` (wrapper global de telas).
 * Mantemos `ScreenContainer` como alias para não quebrar imports existentes.
 */
export type ScreenContainerProps = ResponsiveContainerProps;

const ScreenContainer = (props: ScreenContainerProps) => {
  return <ResponsiveContainer {...props} />;
};

export default ScreenContainer;


