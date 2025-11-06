import React, { useMemo } from "react";
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";

const LOGO_SOURCE = require("../../assets/logo.jpeg");

const { width: ORIGINAL_WIDTH, height: ORIGINAL_HEIGHT } = Image.resolveAssetSource(
  LOGO_SOURCE
);

const LOGO_ASPECT_RATIO = ORIGINAL_WIDTH / ORIGINAL_HEIGHT;
const DEFAULT_WIDTH_RATIO = 0.45; // 45% da largura da tela
const MAX_WIDTH = 280;

type AppLogoProps = {
  /**
   * Largura desejada em pixels. Se não informado, usa uma fração da largura da tela.
   */
  width?: number;
  /**
   * Estilos adicionais para o contêiner do logo.
   */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Estilos adicionais aplicados diretamente na imagem.
   */
  imageStyle?: StyleProp<ImageStyle>;
};

export const AppLogo: React.FC<AppLogoProps> = ({
  width,
  containerStyle,
  imageStyle,
}) => {
  const { width: windowWidth } = useWindowDimensions();

  const computedDimensions = useMemo(() => {
    const baseWidth = width ?? Math.min(windowWidth * DEFAULT_WIDTH_RATIO, MAX_WIDTH);
    const computedHeight = baseWidth / LOGO_ASPECT_RATIO;
    return {
      width: baseWidth,
      height: computedHeight,
    };
  }, [width, windowWidth]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={LOGO_SOURCE}
        style={[styles.logo, computedDimensions, imageStyle]}
        resizeMode="contain"
        accessible
        accessibilityRole="image"
        accessibilityLabel="Logotipo da GEMPTEC"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    maxWidth: MAX_WIDTH,
  },
});

export default AppLogo;


