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
