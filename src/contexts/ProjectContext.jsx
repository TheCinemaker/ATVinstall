import { createContext, useContext, useState, useEffect } from 'react';

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

    const value = {
        currentProject,
        setCurrentProject
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}
