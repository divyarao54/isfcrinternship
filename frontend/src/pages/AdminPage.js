import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../styles/admin.css";
import DeleteModal from '../components/DeleteModal';
import PublicationTypeSelector from '../components/PublicationTypeSelector';
import PublicationForm from '../components/PatentForm';

const AdminPage = () => {
  const [scholarLink, setScholarLink] = useState("");
  const [status, setStatus] = useState("");
  // const [isLoading, setIsLoading] = useState(false);
  // const [elasticsearchStatus, setElasticsearchStatus] = useState(null);

  //login functionality states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changePasswordStatus, setChangePasswordStatus] = useState("");
  const [view, setView] = useState('entry'); // 'entry', 'login', 'signup', 'forgot', 'reset', 'admin'
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupAnswer1, setSignupAnswer1] = useState("");
  const [signupAnswer2, setSignupAnswer2] = useState("");
  const [signupStatus, setSignupStatus] = useState("");
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotAnswer1, setForgotAnswer1] = useState("");
  const [forgotAnswer2, setForgotAnswer2] = useState("");
  const [forgotStatus, setForgotStatus] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetStatus, setResetStatus] = useState("");

  // Single admin system states
  const [adminExists, setAdminExists] = useState(false);
  const [securityCode, setSecurityCode] = useState("");
  const [generatedSecurityCode, setGeneratedSecurityCode] = useState("");
  const [showSecurityCodeModal, setShowSecurityCodeModal] = useState(false);

  // Delete functionality states
  // const [showTeacherList, setShowTeacherList] = useState(false);
  // const [showPublicationList, setShowPublicationList] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [publications, setPublications] = useState([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [isLoadingPublications, setIsLoadingPublications] = useState(false);

  // Add state for delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Add state for background tasks
  const [activeTasks, setActiveTasks] = useState({});
  const [taskStatuses, setTaskStatuses] = useState({});

  // Add publication form state
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [addPubTeacherName, setAddPubTeacherName] = useState("");
  const [customTeacherName, setCustomTeacherName] = useState("");
  const [addPubSuccess, setAddPubSuccess] = useState("");

  // Session timeout functionality (single timeout via refs)
  const timeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const isLoggingOutRef = useRef(false);
  const pausedRef = useRef(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(null);
  const [isOperationActive, setIsOperationActive] = useState(false);
  const SESSION_TIMEOUT_MINUTES = 2; // 2 minutes timeout

  // Session timeout functions
  const resetSessionTimeout = () => {
    console.log('🔄 Resetting session timeout');
    if (timeoutRef.current) {
      console.log('🗑️ Clearing existing timeout');
      clearTimeout(timeoutRef.current);
    }
    
    // Only set timeout if not paused
    if (!pausedRef.current) {
      const timeout = setTimeout(() => {
        console.log('⏰ Session timeout expired, triggering logout');
        handleAutoLogout();
      }, SESSION_TIMEOUT_MINUTES * 60 * 1000);
      timeoutRef.current = timeout;
      console.log('✅ New timeout set for', SESSION_TIMEOUT_MINUTES, 'minutes');
    } else {
      console.log('⏸️ Timeout not set because session is paused');
      timeoutRef.current = null;
    }
    
    // Update the display immediately after resetting
    setTimeout(() => {
      updateSessionTimeRemaining();
    }, 100);
  };

  const handleAutoLogout = () => {
    console.log('🔄 Auto logout triggered');
    // Only redirect if currently logged in
    if (isLoggedIn && !isLoggingOutRef.current) {
      isLoggingOutRef.current = true;
      console.log('🚪 Logging out user');
      setIsLoggedIn(false);
      localStorage.removeItem('isAdminLoggedIn');
      localStorage.removeItem('adminLoginTime');
      setShowChangePassword(false);
      setView('login'); // Direct redirect to login page
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setTimeout(() => { isLoggingOutRef.current = false; }, 0);
    } else {
      console.log('❌ User not logged in, skipping logout');
    }
  };

  const updateActivity = () => {
    if (isLoggedIn) {
      // Always update activity timestamp
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem('adminLoginTime', new Date(now).toISOString());
      
      console.log('📝 Activity detected, operations running:', isOperationRunning());
      
      // Only reset timeout if no operations are running
      if (!isOperationRunning()) {
        console.log('⏰ Resetting session timeout');
        resetSessionTimeout();
      } else {
        // If operations are running, just update the display
        console.log('⏸️ Operations running, updating display only');
        updateSessionTimeRemaining();
      }
    }
  };

  // Enhanced activity detection for specific admin interactions
  const handleAdminActivity = () => {
    if (isLoggedIn) {
      // Force activity update for admin-specific actions
      updateActivity();
    }
  };

  const isOperationRunning = () => {
    // Check if any background tasks are running
    const hasRunningTasks = Object.values(taskStatuses).some(status => 
      status && (status.status === 'pending' || status.status === 'running')
    );
    
    // Check if any operations are in progress
    return hasRunningTasks || isOperationActive;
  };

  const shouldPauseSessionTimeout = () => {
    // Pause timeout if operations are running OR if user is actively interacting
    const hasRunningTasks = Object.values(taskStatuses).some(status => 
      status && (status.status === 'pending' || status.status === 'running')
    );
    
    const shouldPause = hasRunningTasks || isOperationActive;
    return shouldPause;
  };

  const pauseSessionTimeout = () => {
    console.log('⏸️ Pausing session timeout');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pausedRef.current = true;
  };

  const resumeSessionTimeout = () => {
    console.log('▶️ Resuming session timeout');
    if (pausedRef.current) {
      pausedRef.current = false;
      resetSessionTimeout();
    }
  };

  const updateSessionTimeRemaining = () => {
    // If session timeout is paused due to operations, show paused status
    if (shouldPauseSessionTimeout()) {
      setSessionTimeRemaining(null);
      return;
    }

    // Calculate time remaining based on the last activity time
    const lastTs = lastActivityRef.current;
    if (lastTs) {
      const now = Date.now();
      const elapsedMs = now - lastTs;
      const remainingMs = Math.max(0, SESSION_TIMEOUT_MINUTES * 60 * 1000 - elapsedMs);
      const minutesRemaining = remainingMs / (1000 * 60);
      
      if (minutesRemaining > 0) {
        setSessionTimeRemaining(Math.floor(minutesRemaining));
      } else {
        setSessionTimeRemaining(0);
      }
      
      // Debug: Check if timeout should have expired (but only if we're actually logged in)
      if (remainingMs <= 0 && timeoutRef.current && isLoggedIn) {
        console.log('⚠️ Time should have expired but timeout still exists, forcing logout');
        handleAutoLogout();
      }
    } else {
      // If no timeout is set, show full time remaining
      setSessionTimeRemaining(SESSION_TIMEOUT_MINUTES);
    }
  };

  // Fetch teachers for delete modal
  const fetchTeachers = async () => {
    setIsLoadingTeachers(true);
    try {
      const res = await axios.get('http://localhost:5000/teachers');
      setTeachers(res.data.teachers || []);
    } catch (err) {
      setTeachers([]);
    }
    setIsLoadingTeachers(false);
  };

  // Fetch publications for a teacher
  const fetchPublications = async (teacher) => {
    setSelectedTeacher(teacher);
    setIsLoadingPublications(true);
    try {
      const res = await axios.get(`http://localhost:5000/teachers/${encodeURIComponent(teacher.name)}/publications`);
      setPublications(res.data.publications || []);
    } catch (err) {
      setPublications([]);
    }
    setIsLoadingPublications(false);
  };

  // Delete a teacher (profile and all data)
  const handleDeleteTeacher = async (teacher) => {
    if (!window.confirm(`Are you sure you want to delete ${teacher.name} and all their data? This cannot be undone.`)) return;
    try {
      setIsOperationActive(true); // Set operation as active
      pauseSessionTimeout(); // Pause session timeout during delete
      await axios.delete(`http://localhost:5000/teachers/${encodeURIComponent(teacher.name)}`);
      setTeachers(teachers.filter(t => t._id !== teacher._id));
      if (selectedTeacher && selectedTeacher._id === teacher._id) {
        setSelectedTeacher(null);
        setPublications([]);
      }
    } catch (err) {
      alert('Failed to delete teacher.');
    } finally {
      setIsOperationActive(false); // Set operation as inactive
      resumeSessionTimeout(); // Resume session timeout after delete
    }
  };

  // Delete a publication
  const handleDeletePublication = async (pub) => {
    if (!window.confirm(`Delete publication: ${pub.title}?`)) return;
    try {
      setIsOperationActive(true); // Set operation as active
      pauseSessionTimeout(); // Pause session timeout during delete
      await axios.delete(`http://localhost:5000/teachers/${encodeURIComponent(selectedTeacher.name)}/publications/${pub._id}`);
      setPublications(publications.filter(p => p._id !== pub._id));
    } catch (err) {
      alert('Failed to delete publication.');
    } finally {
      setIsOperationActive(false); // Set operation as inactive
      resumeSessionTimeout(); // Resume session timeout after delete
    }
  };

  // Open delete modal and fetch teachers
  const openDeleteModal = () => {
    setIsDeleteModalOpen(true);
    setSelectedTeacher(null);
    setPublications([]);
    fetchTeachers();
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedTeacher(null);
    setPublications([]);
  };

  // Back to teacher list from publications
  const backToTeachers = () => {
    setSelectedTeacher(null);
    setPublications([]);
  };

  //edit beginning
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (localStorage.getItem('isAdminLoggedIn') === 'true') {
      setIsLoggedIn(true);
      
      // Check if session has expired
      const loginTime = localStorage.getItem('adminLoginTime');
      if (loginTime) {
        const loginDate = new Date(loginTime);
        const now = new Date();
        const timeDiff = now.getTime() - loginDate.getTime();
        const minutesDiff = timeDiff / (1000 * 60);
        
        if (minutesDiff >= SESSION_TIMEOUT_MINUTES) {
          // Session expired
          handleAutoLogout();
          return;
        } else {
          // Session still valid, reset timeout and update display
          lastActivityRef.current = Date.now();
          resetSessionTimeout();
          updateSessionTimeRemaining();
        }
      } else {
        // No login time stored, set it now
        const now = new Date();
        localStorage.setItem('adminLoginTime', now.toISOString());
        lastActivityRef.current = Date.now();
        resetSessionTimeout();
        updateSessionTimeRemaining();
      }
    }
  }, []);

  // Check admin status when entering signup view
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (view === 'signup') {
      checkAdminStatus();
    }
  }, [view]);

  const checkAdminStatus = async () => {
    try {
      const response = await axios.get("http://localhost:5000/admin/status");
      setAdminExists(response.data.admin_exists);
    } catch (error) {
      console.error("Error checking admin status:", error);
      setAdminExists(false);
    }
  };

  // On successful login, persist login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const response = await axios.post("http://localhost:5000/admin/login", {
        username: loginUsername,
        password: loginPassword,
      });
      if (response.data.success) {
        setIsLoggedIn(true);
        localStorage.setItem('isAdminLoggedIn', 'true');
        localStorage.setItem('adminLoginTime', new Date().toISOString());
        setLoginUsername("");
        setLoginPassword("");
        
        // Set up session timeout after successful login
        setTimeout(() => {
          // Initialize last activity time
          lastActivityRef.current = Date.now();
          resetSessionTimeout();
          updateSessionTimeRemaining();
        }, 100);
      } else {
        setLoginError("Invalid username or password");
      }
    } catch (error) {
      setLoginError(
        error.response?.data?.error || "Login failed. Please try again."
      );
    }
  };

  // Logout handler
  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminLoginTime');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // Reset refs to prevent stale references
    lastActivityRef.current = null;
    pausedRef.current = false;
    isLoggingOutRef.current = false;
    setShowChangePassword(false);
    setView('entry');
  };

  // Load active tasks from localStorage on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const savedTasks = localStorage.getItem('activeTasks');
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks);
      setActiveTasks(tasks);
      // Check status of saved tasks
      Object.keys(tasks).forEach(taskId => {
        checkTaskStatus(taskId);
      });
    }
  }, []);

  // Save active tasks to localStorage
  const saveActiveTasks = (tasks) => {
    setActiveTasks(tasks);
    localStorage.setItem('activeTasks', JSON.stringify(tasks));
  };

  // Check task status
  const checkTaskStatus = async (taskId) => {
    try {
      const response = await axios.get(`http://localhost:5000/tasks/${taskId}/status`);
      const status = response.data;
      setTaskStatuses(prev => ({
        ...prev,
        [taskId]: status
      }));
      
      // Remove completed/failed tasks from active tasks
      if (status.status === 'completed' || status.status === 'failed') {
        const updatedTasks = { ...activeTasks };
        delete updatedTasks[taskId];
        saveActiveTasks(updatedTasks);
      }
    } catch (error) {
      console.error('Error checking task status:', error);
    }
  };

  // Start background scraping
  const handleScrape = async () => {
    try {
      setIsOperationActive(true); // Set operation as active
      pauseSessionTimeout(); // Pause session timeout during scraping
      setStatus("Starting scraping in background...");
      const response = await axios.post("http://localhost:5000/admin/scrape", {
        profileUrl: scholarLink,
      });
      
      if (response.data.task_id) {
        const taskId = response.data.task_id;
        const updatedTasks = { ...activeTasks, [taskId]: { type: 'scraping', profileUrl: scholarLink } };
        saveActiveTasks(updatedTasks);
        setStatus(`✅ Scraping started! Task ID: ${taskId}`);
        setScholarLink(""); // Clear input
      } else {
        setStatus("❌ Failed to start scraping task");
      }
    } catch (error) {
      setStatus("❌ Scraping failed: " + (error.response?.data?.error || error.message));
    } finally {
      setIsOperationActive(false); // Set operation as inactive
      resumeSessionTimeout(); // Resume session timeout after scraping
    }
  };

  // Start background update all
  const handleUpdateAll = async () => {
    setStatus("Starting update all in background...");
    try {
      setIsOperationActive(true); // Set operation as active
      pauseSessionTimeout(); // Pause session timeout during update all
      const response = await axios.post("http://localhost:5000/admin/update-all");
      
      if (response.data.task_id) {
        const taskId = response.data.task_id;
        const updatedTasks = { ...activeTasks, [taskId]: { type: 'update_all' } };
        saveActiveTasks(updatedTasks);
        setStatus(`✅ Update all started! Task ID: ${taskId}`);
      } else {
        setStatus("❌ Failed to start update all task");
      }
    } catch (err) {
      setStatus("❌ Update failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsOperationActive(false); // Set operation as inactive
      resumeSessionTimeout(); // Resume session timeout after update all
    }
  };

  // Poll task statuses periodically
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const interval = setInterval(() => {
      Object.keys(activeTasks).forEach(taskId => {
        checkTaskStatus(taskId);
      });
      
      // Only pause/resume if the status actually changed
      const currentPauseStatus = shouldPauseSessionTimeout();
      if (currentPauseStatus !== pausedRef.current) {
        if (currentPauseStatus) {
          console.log('⏸️ Pausing session timeout due to operations');
          pauseSessionTimeout();
        } else {
          console.log('▶️ Resuming session timeout after operations');
          resumeSessionTimeout();
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [activeTasks, taskStatuses]);

  // Get status message for a task
  const getTaskStatusMessage = (taskId) => {
    const status = taskStatuses[taskId];
    if (!status) return "Checking status...";
    
    switch (status.status) {
      case 'pending':
        return "⏳ Task queued...";
      case 'running':
        return status.result?.message || "🔄 Processing...";
      case 'completed':
        return `✅ ${status.result?.message || 'Task completed'}`;
      case 'failed':
        return `❌ Failed: ${status.error || 'Unknown error'}`;
      default:
        return "Unknown status";
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleUpdate = async () => {
    try {
      setIsOperationActive(true); // Set operation as active
      pauseSessionTimeout(); // Pause session timeout during update
      setStatus("Updating...");
      const response = await axios.put("http://localhost:5000/admin/update", {
        profileUrl: scholarLink,
      });
      setStatus(`🔁 Updated: ${response.data.message}`);
    } catch (error) {
      setStatus("❌ Update failed: " + (error.response?.data?.error || error.message));
    } finally {
      setIsOperationActive(false); // Set operation as inactive
      resumeSessionTimeout(); // Resume session timeout after update
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleDelete = async () => {
    try {
      setIsOperationActive(true); // Set operation as active
      pauseSessionTimeout(); // Pause session timeout during delete
      setStatus("Deleting...");
      const response = await axios.delete("http://localhost:5000/admin/delete", {
        data: { profileUrl: scholarLink },
      });
      setStatus(`🗑️ Deleted: ${response.data.message}`);
    } catch (error) {
      setStatus("❌ Deletion failed: " + (error.response?.data?.error || error.message));
    } finally {
      setIsOperationActive(false); // Set operation as inactive
      resumeSessionTimeout(); // Resume session timeout after delete
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordStatus("");
    if (newPassword !== confirmNewPassword) {
      setChangePasswordStatus("New passwords do not match.");
      return;
    }
    try {
      const response = await axios.post("http://localhost:5000/admin/change_password", {
        username: loginUsername || "Nihal", // Use the logged-in username
        oldPassword,
        newPassword,
      });
      if (response.data.success) {
        setChangePasswordStatus("Password changed successfully.");
        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setShowChangePassword(false);
      } else {
        setChangePasswordStatus("Failed to change password.");
      }
    } catch (error) {
      setChangePasswordStatus(
        error.response?.data?.error || "Failed to change password."
      );
    }
  };

  // Add missing handlers for ES Status and Update All
  const checkElasticsearchStatus = async () => {
    try {
      setStatus("🔄 Checking Elasticsearch status...");
      const response = await axios.get("http://localhost:5000/elasticsearch/status");
      // eslint-disable-next-line no-unused-vars
      const _esStatus = response.data;
      if (response.data.status === 'connected') {
        setStatus(`✅ Elasticsearch connected! Found ${response.data.paper_indices} paper indices.`);
      } else {
        setStatus(`❌ Elasticsearch error: ${response.data.message}`);
      }
    } catch (error) {
      setStatus(`❌ Failed to check Elasticsearch status: ${error.message}`);
    }
  };

  // Fetch teachers on mount for the add publication dropdown
  useEffect(() => {
    fetchTeachers();
  }, []);

  // Add activity listeners for session timeout
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isLoggedIn) {
      const activityEvents = [
        'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click',
        'keydown', 'input', 'change', 'focus', 'blur', 'wheel', 'drag', 'drop'
      ];
      
      let activityTimeout = null;
      
      const handleActivity = () => {
        // Debounce activity updates to avoid excessive calls
        if (activityTimeout) {
          clearTimeout(activityTimeout);
        }
        
        activityTimeout = setTimeout(() => {
          updateActivity();
        }, 100); // Debounce to 100ms
      };

      activityEvents.forEach(event => {
        document.addEventListener(event, handleActivity, true);
      });

      // Also listen for window focus/blur events
      const handleWindowFocus = () => {
        updateActivity();
      };
      
      const handleWindowBlur = () => {
        // Don't update activity when window loses focus
        // This prevents logout when user switches tabs
      };

      window.addEventListener('focus', handleWindowFocus);
      window.addEventListener('blur', handleWindowBlur);

      // Initial timeout setup
      resetSessionTimeout();
      updateSessionTimeRemaining();

      // Update session time remaining every 30 seconds
      const sessionTimer = setInterval(() => {
        updateSessionTimeRemaining();
      }, 30000); // Update every 30 seconds
      
      // Add a periodic timeout validation check
      const timeoutValidator = setInterval(() => {
        // Only run validation if user is logged in
        if (isLoggedIn && timeoutRef.current && lastActivityRef.current) {
          const now = Date.now();
          const elapsedMs = now - lastActivityRef.current;
          const shouldExpire = elapsedMs >= SESSION_TIMEOUT_MINUTES * 60 * 1000;
          
          if (shouldExpire && !shouldPauseSessionTimeout()) {
            console.log('🔍 Timeout validation: Should expire, forcing logout');
            handleAutoLogout();
          }
        }
      }, 10000); // Check every 10 seconds

      return () => {
        activityEvents.forEach(event => {
          document.removeEventListener(event, handleActivity, true);
        });
        window.removeEventListener('focus', handleWindowFocus);
        window.removeEventListener('blur', handleWindowBlur);
        
        if (activityTimeout) {
          clearTimeout(activityTimeout);
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        clearInterval(sessionTimer);
        clearInterval(timeoutValidator);
      };
    }
  }, [isLoggedIn]);

  // Entry screen
  if (view === 'entry') {
    return (
      <div className="admin-bg">
        <div className="admin-container">
          <div className="admin-logo"></div>
          <h2>Admin Access</h2>
          <div className="admin-entry-buttons">
            <button className="login" onClick={() => setView('login')}>Login</button>
            <button className="signup" onClick={() => setView('signup')}>Sign Up</button>
          </div>
        </div>
      </div>
    );
  }

  // Signup form
  if (view === 'signup') {
    return (
      <div className="admin-bg">
      <div className="admin-container">
        <div className="admin-logo"></div>
        <h2>Admin Sign Up</h2>
        {adminExists && (
          <div style={{ 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeaa7', 
            borderRadius: '5px', 
            padding: '10px', 
            marginBottom: '20px',
            color: '#856404'
          }}>
            <strong>Admin Replacement:</strong> An admin already exists. You will replace the current admin. You need the security code to proceed.
          </div>
        )}
        {!adminExists && (
          <div style={{ 
            backgroundColor: '#d4edda', 
            border: '1px solid #c3e6cb', 
            borderRadius: '5px', 
            padding: '10px', 
            marginBottom: '20px',
            color: '#155724'
          }}>
            <strong>First Admin:</strong> You will be the first admin. A security code will be generated for you to save securely.
          </div>
        )}
        <form onSubmit={async (e) => {
          e.preventDefault();
          setSignupStatus("");
          if (!signupUsername || !signupPassword || !signupAnswer1 || !signupAnswer2) {
            setSignupStatus("All fields are required.");
            return;
          }
          if (adminExists && !securityCode) {
            setSignupStatus("Security code is required when replacing an existing admin.");
            return;
          }
          try {
            const res = await axios.post("http://localhost:5000/admin/signup", {
              username: signupUsername,
              password: signupPassword,
              answer1: signupAnswer1,
              answer2: signupAnswer2,
              securityCode: securityCode,
            });
            if (res.data.success) {
              if (res.data.security_code) {
                // First admin or admin replacement - show security code modal
                setGeneratedSecurityCode(res.data.security_code);
                setShowSecurityCodeModal(true);
              } else {
                // This shouldn't happen with single admin system, but handle gracefully
                setSignupStatus("Sign up successful! You can now log in.");
                setSignupUsername(""); setSignupPassword(""); setSignupAnswer1(""); setSignupAnswer2(""); setSecurityCode("");
                setTimeout(() => setView('login'), 1500);
              }
            }
          } catch (err) {
            setSignupStatus(err.response?.data?.error || "Sign up failed.");
          }
        }} className="admin-signup-form">
          <input type="text" placeholder="Username" value={signupUsername} onChange={e => setSignupUsername(e.target.value)} className="admin-input" autoComplete="username" />
          <input type="password" placeholder="Password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} className="admin-input" autoComplete="new-password" />
          <input type="text" placeholder="What's your favourite colour?" value={signupAnswer1} onChange={e => setSignupAnswer1(e.target.value)} className="admin-input" />
          <input type="text" placeholder="Where were you born?" value={signupAnswer2} onChange={e => setSignupAnswer2(e.target.value)} className="admin-input" />
          {adminExists && (
            <input 
              type="text" 
              placeholder="Security Code (required for replacement)" 
              value={securityCode} 
              onChange={e => setSecurityCode(e.target.value)} 
              className="admin-input" 
              style={{ borderColor: '#dc3545' }}
            />
          )}
          <button type="submit">Sign Up</button>
        </form>
        {signupStatus && <p className="status-text" style={{ color: signupStatus.includes('success') ? 'green' : 'red' }}>{signupStatus}</p>}
        <div className="admin-entry-buttons">
          <button type="button" className="signup" onClick={() => setView('entry')}>Back</button>
        </div>

        {/* Security Code Modal */}
        {showSecurityCodeModal && (
            <div className="security-code-modal">
              <div className="security-code-container">
                <div className="security-code-header">
                  <h3>Security Code</h3>
                  <button className="security-code-close" onClick={() => setShowSecurityCodeModal(false)}>&times;</button>
                </div>
                <div className="security-code-content">
                  <p style={{ fontWeight: 'bold', color: '#1976d2', fontSize: '1.2rem', marginBottom: '10px' }}>Your Security Code:</p>
                  <p style={{ fontWeight: 'bold', color: '#d32f2f', fontSize: '1.5rem', marginBottom: '20px', letterSpacing: '2px' }}>{generatedSecurityCode}</p>
                  <p style={{ color: '#333', fontSize: '1rem', marginBottom: '20px' }}>Please save this code securely. It will be required for any future admin replacements.</p>
                <div style={{ textAlign: 'center' }}>
                  <button 
                    onClick={() => {
                      setShowSecurityCodeModal(false);
                      setSignupUsername(""); 
                      setSignupPassword(""); 
                      setSignupAnswer1(""); 
                      setSignupAnswer2(""); 
                      setSecurityCode("");
                      setView('login');
                    }}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    I've Saved the Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    );
  }

  // Login form
  if (view === 'login' && !isLoggedIn) {
    return (
      <div className="admin-bg">
      <div className="admin-container">
        <div className="admin-logo"></div>
        <h2>Admin Login</h2>
        <form onSubmit={handleLogin} className="admin-login-form">
          <input type="text" placeholder="Username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="admin-input" autoComplete="username" />
          <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="admin-input" autoComplete="current-password" />
            <div style = {{display: 'flex', flexDirection: 'column'}}>    
              <div>
          <button type="submit">Login</button>
                <button type="button" className="secondary" onClick={() => setView('entry')}>Back</button>
              </div>
              <div>
          <button type="button" className="secondary" onClick={() => setView('forgot')}>Forgot Password?</button>
              </div>
            </div>
        </form>
        {loginError && <p className="status-text" style={{ color: 'red' }}>{loginError}</p>}
        </div>
      </div>
    );
  }

  // Forgot password (security questions)
  if (view === 'forgot') {
    return (
      <div className="admin-bg">
      <div className="admin-container">
        <div className="admin-logo"></div>
        <h2>Forgot Password</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setForgotStatus("");
          if (!forgotUsername || !forgotAnswer1 || !forgotAnswer2) {
            setForgotStatus("All fields are required.");
            return;
          }
          try {
            const res = await axios.post("http://localhost:5000/admin/forgot_password", {
              username: forgotUsername,
              answer1: forgotAnswer1,
              answer2: forgotAnswer2,
            });
            if (res.data.success) {
              setForgotStatus("Security answers verified. You can now reset your password.");
              setTimeout(() => setView('reset'), 1000);
            }
          } catch (err) {
            setForgotStatus(err.response?.data?.error || "Verification failed.");
          }
        }} className="admin-forgot-form">
          <input type="text" placeholder="Username" value={forgotUsername} onChange={e => setForgotUsername(e.target.value)} className="admin-input" autoComplete="username" />
          <input type="text" placeholder="What's your favourite colour?" value={forgotAnswer1} onChange={e => setForgotAnswer1(e.target.value)} className="admin-input" />
          <input type="text" placeholder="Where were you born?" value={forgotAnswer2} onChange={e => setForgotAnswer2(e.target.value)} className="admin-input" />
          <button type="submit">Verify</button>
        </form>
        {forgotStatus && <p className="status-text" style={{ color: forgotStatus.includes('verified') ? 'green' : 'red' }}>{forgotStatus}</p>}
        <button onClick={() => setView('login')} style={{ marginTop: 16 }}>Back</button>
        </div>
      </div>
    );
  }

  // Reset password after security answers
  if (view === 'reset') {
    return (
      <div className="admin-bg">
      <div className="admin-container">
        <div className="admin-logo"></div>
        <h2>Reset Password</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setResetStatus("");
          if (!forgotUsername || !resetPassword || !resetConfirmPassword) {
            setResetStatus("All fields are required.");
            return;
          }
          if (resetPassword !== resetConfirmPassword) {
            setResetStatus("Passwords do not match.");
            return;
          }
          try {
            const res = await axios.post("http://localhost:5000/admin/reset_password", {
              username: forgotUsername,
              newPassword: resetPassword,
            });
            if (res.data.success) {
              setResetStatus("Password reset successful! You can now log in.");
              setTimeout(() => setView('login'), 1500);
            }
          } catch (err) {
            setResetStatus(err.response?.data?.error || "Password reset failed.");
          }
        }} className="admin-reset-form">
          <input type="password" placeholder="New Password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="admin-input" autoComplete="new-password" />
          <input type="password" placeholder="Confirm New Password" value={resetConfirmPassword} onChange={e => setResetConfirmPassword(e.target.value)} className="admin-input" autoComplete="new-password" />
          <button type="submit">Reset Password</button>
        </form>
        {resetStatus && <p className="status-text" style={{ color: resetStatus.includes('successful') ? 'green' : 'red' }}>{resetStatus}</p>}
        <button onClick={() => setView('login')} style={{ marginTop: 16 }}>Back</button>
        </div>
      </div>
    );
  }

  if (isLoggedIn && showChangePassword) {
    return (
      <div className="admin-bg">
      <div className="admin-container">
        <h2>Change Password</h2>
        <form onSubmit={handleChangePassword} className="admin-change-password-form">
          <input type="password" placeholder="Old Password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="admin-input" autoComplete="current-password" />
          <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="admin-input" autoComplete="new-password" />
          <input type="password" placeholder="Confirm New Password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="admin-input" autoComplete="new-password" />
          <button type="submit">Change Password</button>
          {changePasswordStatus && (
            <p className="status-text" style={{ color: changePasswordStatus.includes('success') ? 'green' : 'red' }}>{changePasswordStatus}</p>
          )}
        </form>
        <button onClick={() => setShowChangePassword(false)} style={{ marginTop: 16 }}>Back</button>
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="admin-bg">
        <div className="admin-container" style={{ position: 'relative' }}>
          {/* Session Status Indicator */}
          {isLoggedIn && sessionTimeRemaining !== null && (
            <div style={{ 
              position: 'absolute',
              top: '20px',
              left: '20px',
              zIndex: 100,
              color: shouldPauseSessionTimeout() ? '#1976d2' : '#666666',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Session: {shouldPauseSessionTimeout() ? '⏸️ Paused' : `${sessionTimeRemaining} min remaining`}
            </div>
          )}

          {/* Plus Icon - Top Right Corner of Admin Page */}
          <div style={{ 
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 100
          }}>
            <button
              onClick={() => { setShowTypeSelector(true); handleAdminActivity(); }}
              style={{ 
                padding: '12px', 
                borderRadius: '50%', 
                background: '#1976d2', 
                color: 'white', 
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.1)';
                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                handleAdminActivity();
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
              }}
            >
              +
            </button>
          </div>

          <h2>Admin Panel</h2>
          <input
            type="text"
            placeholder="Enter Google Scholar profile link"
            value={scholarLink}
            onChange={(e) => {
              setScholarLink(e.target.value);
              handleAdminActivity();
            }}
            onFocus={handleAdminActivity}
            className="admin-input admin-input-wide"
          />
          <div className="admin-buttons">
            <button onClick={() => { handleScrape(); handleAdminActivity(); }} style={{ background: '#182745', color: 'white' }}>Scrape</button>
            <button onClick={() => { openDeleteModal(); handleAdminActivity(); }} style={{ background: '#182745', color: 'white' }}>Delete</button>
            <button onClick={() => { checkElasticsearchStatus(); handleAdminActivity(); }} style={{ background: '#182745', color: 'white' }}>Check ES Status</button>
            <button onClick={() => { handleUpdateAll(); handleAdminActivity(); }} style={{ background: '#182745', color: 'white' }}>Update All</button>
          </div>
          <div className="admin-account-buttons">
            <button onClick={() => { setShowChangePassword(true); handleAdminActivity(); }} style={{ marginRight: 16, background: '#182745', color: 'white' }}>
              Change Password
            </button>
            <button onClick={handleLogout} style={{ background: '#182745', color: 'white' }}>Logout</button>
          </div>
          {status && <p className="status-text">{status}</p>}
          {addPubSuccess && <div style={{ color: 'green', marginTop: 8, fontSize: '0.9rem' }}>{addPubSuccess}</div>}

          {/* Active Tasks Display */}
          {Object.keys(activeTasks).length > 0 && (
            <div className="active-tasks">
              <h3>Active Tasks</h3>
              {Object.entries(activeTasks).map(([taskId, taskInfo]) => (
                <div key={taskId} className="task-item">
                  <div className="task-info">
                    <span className="task-type">{taskInfo.type === 'scraping' ? 'Scraping' : 'Update All'}</span>
                    {taskInfo.profileUrl && <span className="task-url">{taskInfo.profileUrl}</span>}
                  </div>
                  <div className="task-status">
                    {getTaskStatusMessage(taskId)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

          {/* Teacher Selection Modal */}
          {showTypeSelector && (
            <div className="publication-form-overlay">
              <div className="publication-form-modal publication-form-centered">
                <div className="publication-form-header">
                  <h2>Select Teacher</h2>
                  <button className="close-btn" onClick={() => setShowTypeSelector(false)}>×</button>
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Select from existing teachers:</label>
                    <select
                      value={addPubTeacherName}
                      onChange={e => setAddPubTeacherName(e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        borderRadius: '4px', 
                        border: '1px solid #ccc',
                        marginBottom: '16px'
                      }}
                    >
                      <option value="">Select teacher</option>
                      {teachers.map((t, idx) => (
                        <option key={idx} value={t.name}>{t.name}</option>
                      ))}
                      <option value="__other__">Other (custom name)</option>
                    </select>
                  </div>
                  
                  {addPubTeacherName === "__other__" && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Enter teacher name:</label>
                      <input
                        type="text"
                        placeholder="Enter teacher name"
                        value={customTeacherName}
                        onChange={e => setCustomTeacherName(e.target.value)}
                        style={{ 
                          width: '100%', 
                          padding: '8px', 
                          borderRadius: '4px', 
                          border: '1px solid #ccc'
                        }}
                      />
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setShowTypeSelector(false)}
                      style={{ 
                        padding: '8px 16px', 
                        borderRadius: '4px', 
                        background: '#6c757d', 
                        color: 'white', 
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (addPubTeacherName && addPubTeacherName !== "__other__") {
                          setShowTypeSelector(false);
                          // Show publication type selector
                          setSelectedType('__show_type_selector__');
                        } else if (addPubTeacherName === "__other__" && customTeacherName.trim()) {
                          setShowTypeSelector(false);
                          // Show publication type selector
                          setSelectedType('__show_type_selector__');
                        }
                      }}
                      disabled={!addPubTeacherName || (addPubTeacherName === "__other__" && !customTeacherName.trim())}
                      style={{ 
                        padding: '8px 16px', 
                        borderRadius: '4px', 
                        background: '#1976d2', 
                        color: 'white', 
                        border: 'none',
                        cursor: 'pointer',
                        opacity: (!addPubTeacherName || (addPubTeacherName === "__other__" && !customTeacherName.trim())) ? 0.5 : 1
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Publication Type Selector */}
          {selectedType === '__show_type_selector__' && (
            <PublicationTypeSelector
              isOpen={true}
              onSelect={(type) => { 
                setSelectedType(type); 
              }}
              onClose={() => { 
                setSelectedType(null); 
                setAddPubTeacherName("");
                setCustomTeacherName("");
              }}
            />
          )}

          {/* Publication Form */}
          {selectedType && selectedType !== '__show_type_selector__' && (
            <PublicationForm
              isOpen={true}
              teacherName={addPubTeacherName === "__other__" ? customTeacherName : addPubTeacherName}
              publicationType={selectedType}
              onClose={() => { 
                setSelectedType(null); 
                setAddPubTeacherName("");
                setCustomTeacherName("");
              }}
              onSuccess={() => { 
                setSelectedType(null); 
                setAddPubTeacherName("");
                setCustomTeacherName("");
                setAddPubSuccess("Publication added successfully!"); 
                setTimeout(() => setAddPubSuccess(""), 2000); 
              }}
              onBack={() => { 
                setSelectedType('__show_type_selector__'); 
              }}
            />
          )}
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          teachers={teachers}
          onDeleteTeacher={handleDeleteTeacher}
          onFetchPublications={fetchPublications}
          publications={publications}
          onDeletePublication={handleDeletePublication}
          selectedTeacher={selectedTeacher}
          onBackToTeachers={backToTeachers}
          isLoadingTeachers={isLoadingTeachers}
          isLoadingPublications={isLoadingPublications}
        />
      </div>
    );
  }

  return null;
};

export default AdminPage;
