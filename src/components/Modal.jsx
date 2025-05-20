export default function Modal({ title, onClose, children }) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <h2>{title}</h2>
          <div>{children}</div>
          <button style={styles.close} onClick={onClose}>Fermer</button>
        </div>
      </div>
    )
  }
  
  const styles = {
    overlay: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 999
    },
    modal: {
      background: 'white',
      padding: '2rem',
      borderRadius: '12px',
      maxWidth: '600px',
      width: '90%',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
    },
    close: {
      marginTop: '1rem',
      background: '#eee',
      border: 'none',
      padding: '0.5rem 1rem',
      borderRadius: '6px',
      cursor: 'pointer'
    }
  }
  