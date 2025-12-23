import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';

const ProjectContext = createContext();

export function useProject() {
    return useContext(ProjectContext);
}

export function ProjectProvider({ children }) {
    const [currentProject, setCurrentProject] = useState(() => {
        const saved = localStorage.getItem('currentProject');
        return saved ? JSON.parse(saved) : null;
    });

    // Realtime listener for the current project
    useEffect(() => {
        if (!currentProject?.id) return;

        const projectRef = doc(db, 'projects', currentProject.id);
        const unsubscribe = onSnapshot(projectRef, (doc) => {
            if (doc.exists()) {
                const projectData = { id: doc.id, ...doc.data() };
                // Only update if there are changes to avoid loop, though React handles strict equality checks usually.
                // We mainly want to catch new announcements or team changes.
                // To avoid conflict with local optimistic updates (if any), we just replace the state.
                // But we need to make sure we don't overwrite if we are in the middle of a switch.

                // Simple JSON comparison to avoid unnecessary re-renders/loops if data hasn't actually changed
                // (though onSnapshot usually fires only on change).
                setCurrentProject(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(projectData)) {
                        return projectData;
                    }
                    return prev;
                });
            }
        });

        return () => unsubscribe();
    }, [currentProject?.id]); // Only re-subscribe if ID changes

    // Persist to local storage
    useEffect(() => {
        if (currentProject) {
            localStorage.setItem('currentProject', JSON.stringify(currentProject));
        } else {
            localStorage.removeItem('currentProject');
        }
    }, [currentProject]);
    // We don't need to expose projects list here anymore as ProjectSelect handles it,
    // but if we want global access we can add it. For now, let's keep it simple.

    // Helper to get collection reference
    const projectsRef = collection(db, 'projects');

    const value = {
        currentProject,
        setCurrentProject,
        // Expose Firestore helpers if needed, but components should probably use hooks
        db
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}
