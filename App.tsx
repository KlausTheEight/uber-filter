import React from 'react';
import {View, Text, StyleSheet, StatusBar} from 'react-native';

export default function App(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>UberFilter OK</Text>
      <Text style={styles.subtitle}>Metro + WSL2 + Android 16 conectados</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#DCFCE7',
    marginTop: 8,
  },
});
