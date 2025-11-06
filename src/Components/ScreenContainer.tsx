import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenContainerProps = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  withPadding?: boolean;
};

const ScreenContainer: React.FC<ScreenContainerProps> = ({ children, style, withPadding = true }) => {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe}>
      <View
        style={[
          styles.container,
          withPadding && {
            paddingTop: Math.max(8, insets.top),
            paddingBottom: Math.max(8, insets.bottom),
            paddingLeft: Math.max(8, insets.left),
            paddingRight: Math.max(8, insets.right),
          },
          style as any,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
});

export default ScreenContainer;


