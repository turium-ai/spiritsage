import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    handleReset = () => {
        localStorage.clear();
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: '#0D0D0D',
                    color: '#F5F5F5',
                    fontFamily: 'sans-serif',
                    textAlign: 'center',
                    padding: '20px'
                }}>
                    <h1 style={{ color: '#D4AF37', marginBottom: '20px' }}>Something went wrong</h1>
                    <p style={{ color: '#A0A0A0', marginBottom: '30px', maxWidth: '500px' }}>
                        The application encountered an unexpected error. This might be due to corrupted local data.
                    </p>
                    <button
                        onClick={this.handleReset}
                        style={{
                            background: '#D4AF37',
                            color: '#000',
                            border: 'none',
                            padding: '12px 30px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Reset Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
