import React, { useState, useEffect } from 'react'
import styles from './modal.module.css'

export default function CustomizedModal({ 
    onClose, 
    onConfirm, 
    confirmMessage, 
    confirmButtonText = "OK", 
    allowCancel = true,
    showCancel = false,
    cancelButtonText = "Cancel",
    type = "alert" // "alert" or "confirm"
}) {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        } else {
            onClose();
        }
    };

    return (
        <div className={styles.backgroundModal}>
            <div className={styles.boxModal}>
                <div className={styles.modalHeader}>
                    <div className={styles.headerContent}>
                    </div>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.messageText}>
                        {confirmMessage}
                    </div>
                    <div className={styles.buttonContainer}>
                        <button
                            className={`btn btn-primary`}
                            onClick={handleConfirm}
                        >
                            {confirmButtonText}
                        </button>
                        {(showCancel || type === "confirm") && (
                            <button
                                className={`btn btn-cancel`}
                                onClick={onClose}
                            >
                                {cancelButtonText}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}