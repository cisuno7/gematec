import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌❌❌ ERROR BOUNDARY CAPTUROU ERRO ❌❌❌');
    console.error('[ErrorBoundary] Erro:', error);
    console.error('[ErrorBoundary] Mensagem:', error.message);
    console.error('[ErrorBoundary] Stack:', error.stack);
    console.error('[ErrorBoundary] Component Stack:', errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo,
    });

    // Tentar enviar para servidor de logs (se disponível)
    try {
      fetch('http://127.0.0.1:7242/ingest/6613393d-1811-4ee8-8ac4-8aace6947144', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'ErrorBoundary',
          message: 'Erro capturado pelo ErrorBoundary',
          data: {
            errorMessage: error.message,
            errorStack: error.stack,
            componentStack: errorInfo.componentStack,
          },
          timestamp: Date.now(),
          sessionId: 'error-boundary',
        }),
      }).catch(() => {});
    } catch (e) {
      // Ignorar erros ao tentar logar
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <MaterialIcons name="error-outline" size={64} color="#dc3545" />
          <Text style={styles.title}>Ops! Algo deu errado</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'Erro desconhecido'}
          </Text>
          {__DEV__ && this.state.errorInfo && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Detalhes (modo debug):</Text>
              <Text style={styles.debugText}>
                {this.state.error?.stack?.slice(0, 500)}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  debugContainer: {
    width: '100%',
    maxHeight: 200,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
