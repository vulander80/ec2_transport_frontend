import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const TerminalEmulator = () => {
  const terminalRef = useRef(null);
  const fitAddon = new FitAddon();

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      scrollback: 1000,
    });

    term.loadAddon(fitAddon);

    const container = terminalRef.current;
    if (!container) return;

    term.open(container);

    // Defer fit until terminal is rendered and container has size
    const observer = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        console.warn('Fit failed:', e.message);
      }
    });
    observer.observe(container);

    const socket = new WebSocket('ws://localhost:8000/ws/terminal');

    socket.onopen = () => {
      term.writeln('\r\nConnected to shell...\r\n');
    };

    socket.onmessage = (event) => {
      term.write(event.data);
    };

    term.onData((data) => {
      socket.send(data);
    });

    socket.onclose = () => {
      term.write('\r\n*** Disconnected from server ***\r\n');
    };

    return () => {
      observer.disconnect();
      term.dispose();
      socket.close();
    };
  }, []);

  return (
    <div
      ref={terminalRef}
      className="w-full h-96 bg-black rounded"
      style={{ minHeight: '300px' }}
    />
  );
};

export default TerminalEmulator;
