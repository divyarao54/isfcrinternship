import React, { useState } from 'react';
import axios from 'axios';
import './PatentForm.css';

const PublicationForm = ({ teacherName, publicationType, isOpen, onClose, onSuccess, onBack }) => {
    const [formData, setFormData] = useState({
    title: '',
    conference: '',
    journal: '',
    book: '',
        patentNumber: '',
    applicationNumber: '',
        publicationDate: '',
    description: '',
    pdfLink: '',
    citationCount: '',
    patentFilingNumber: '',
    filedOn: '',
    grantedOn: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

  if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
    try {
      const payload = {
        teacherName,
        title: formData.title,
        publicationDate: formData.publicationDate,
        description: formData.description,
        pdfLink: formData.pdfLink,
        citationCount: formData.citationCount || 0,
        conference: publicationType === 'conference' ? formData.conference : '',
        journal: publicationType === 'journal' ? formData.journal : '',
        book: publicationType === 'book' ? formData.book : '',
        patentNumber: publicationType === 'patent' ? formData.patentNumber : '',
        applicationNumber: publicationType === 'patent' ? formData.applicationNumber : '',
        inventors: publicationType === 'patent' ? formData.inventors : '',
        patent: publicationType === 'patent',
        publicationType,
        patentOffice: publicationType === 'patent' ? formData.patentOffice : '',
        patentFilingNumber: publicationType === 'patent' ? formData.patentFilingNumber : '',
        filedOn: publicationType === 'patent' ? formData.filedOn : '',
        grantedOn: publicationType === 'patent' ? formData.grantedOn : '',
      };
      await axios.post(`http://localhost:5000/teachers/${encodeURIComponent(teacherName)}/add_publication`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (onSuccess) onSuccess();
                setFormData({
        title: '',
        conference: '',
        journal: '',
        book: '',
                    patentNumber: '',
        applicationNumber: '',
                    publicationDate: '',
        description: '',
        pdfLink: '',
        citationCount: '',
        patentFilingNumber: '',
        filedOn: '',
        grantedOn: '',
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save publication.');
        } finally {
            setLoading(false);
        }
    };

    return (
    <div className="publication-form-overlay">
      <div className="publication-form-modal publication-form-centered">
        <div className="publication-form-header">
          <h2>Add {publicationType.charAt(0).toUpperCase() + publicationType.slice(1)} Publication</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="publication-form">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required />
          </div>
          {publicationType === 'conference' && (
                        <div className="form-group">
              <label htmlFor="conference">Conference *</label>
              <input type="text" id="conference" name="conference" value={formData.conference} onChange={handleChange} required />
                        </div>
                    )}
          {publicationType === 'journal' && (
                        <div className="form-group">
              <label htmlFor="journal">Journal *</label>
              <input type="text" id="journal" name="journal" value={formData.journal} onChange={handleChange} required />
                        </div>
                    )}
          {publicationType === 'book' && (
                        <div className="form-group">
              <label htmlFor="book">Book *</label>
              <input type="text" id="book" name="book" value={formData.book} onChange={handleChange} required />
                        </div>
          )}
          {publicationType === 'patent' && (
            <>
                        <div className="form-group">
                            <label htmlFor="patentNumber">Patent Number</label>
                <input type="text" id="patentNumber" name="patentNumber" value={formData.patentNumber} onChange={handleChange} />
                        </div>
              <div className="form-group">
                <label htmlFor="applicationNumber">Application Number</label>
                <input type="text" id="applicationNumber" name="applicationNumber" value={formData.applicationNumber} onChange={handleChange} />
                    </div>
                        <div className="form-group">
                            <label htmlFor="inventors">Inventors *</label>
                <input type="text" id="inventors" name="inventors" value={formData.inventors} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="patentOffice">Patent Office</label>
                <input type="text" id="patentOffice" name="patentOffice" value={formData.patentOffice} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="patentFilingNumber">Patent Filing Number</label>
                <input type="text" id="patentFilingNumber" name="patentFilingNumber" value={formData.patentFilingNumber} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="filedOn">Filed On</label>
                <input type="date" id="filedOn" name="filedOn" value={formData.filedOn} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="grantedOn">Granted On</label>
                <input type="date" id="grantedOn" name="grantedOn" value={formData.grantedOn} onChange={handleChange} />
                        </div>
            </>
          )}
                        <div className="form-group">
            <label htmlFor="publicationDate">Publication Date</label>
            <input type="date" id="publicationDate" name="publicationDate" value={formData.publicationDate} onChange={handleChange} />
                        </div>
                        <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} />
                        </div>
                        <div className="form-group">
            <label htmlFor="pdfLink">PDF Link</label>
            <input type="url" id="pdfLink" name="pdfLink" value={formData.pdfLink} onChange={handleChange} placeholder="https://..." />
                        </div>
                        <div className="form-group">
            <label htmlFor="citationCount">Number of Citations</label>
            <input type="number" id="citationCount" name="citationCount" value={formData.citationCount} onChange={handleChange} min="0" />
                    </div>
                    <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onBack ? onBack : onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Saving...' : 'Add Publication'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PublicationForm; 