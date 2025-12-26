import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generatePDF = (title, project, data, type = 'total') => {
    // Create new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    // Helper: Add Header
    const addHeader = () => {
        // Black Header Background
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, pageWidth, 40, 'F');

        // Project Name (Yellow)
        doc.setTextColor(234, 179, 8); // #eab308
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(project.name, margin, 20);

        // Report Title (White)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(title.toUpperCase(), margin, 32);

        // Date (Right side)
        doc.setFontSize(10);
        doc.setTextColor(200, 200, 200);
        const dateStr = new Date().toLocaleDateString();
        doc.text(dateStr, pageWidth - margin, 20, { align: 'right' });

        // Location (Right side below date)
        if (project.location) {
            doc.text(project.location, pageWidth - margin, 26, { align: 'right' });
        }
    };

    // Helper: Add Footer
    const addFooter = (pageNumber, totalPages) => {
        const footerY = pageHeight - 15;

        // Line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, footerY, pageWidth - margin, footerY);

        // Text
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Software by SA Software', margin, footerY + 8);

        // Page Number
        if (pageNumber && totalPages) {
            doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, footerY + 8, { align: 'right' });
        }
    };

    // --- Content Generation ---

    addHeader();

    let startY = 50;

    // Table Logic based on Type
    if (type === 'total') {
        const tableColumn = ["Device Type", "Installed", "Target", "Status"];
        const tableRows = [];

        // Dynamic Rows from Project Devices
        (project.devices || ['TV', 'AP']).forEach(device => {
            const dbType = device === 'TV Cloning' ? 'cloning' : device.toLowerCase();
            const count = data.installations.filter(i => i.deviceType?.toLowerCase() === dbType).length;
            const target = project.targets?.[device] || 0;
            const progress = target > 0 ? Math.round((count / target) * 100) : 0;

            tableRows.push([
                device,
                count.toString(),
                target > 0 ? target.toString() : '-',
                target > 0 ? `${progress}%` : 'N/A'
            ]);
        });

        // Add Issues Summary Row
        const openIssues = data.issues.filter(i => i.status !== 'resolved').length;
        const resolvedIssues = data.issues.filter(i => i.status === 'resolved').length;

        tableRows.push(['', '', '', '']); // Spacer
        tableRows.push(['Active Issues', openIssues.toString(), '-', 'OPEN']);
        tableRows.push(['Resolved Issues', resolvedIssues.toString(), '-', 'RESOLVED']);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: startY,
            theme: 'grid',
            headStyles: { fillColor: [0, 0, 0], textColor: [234, 179, 8] },
            styles: { fontSize: 10, cellPadding: 3 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            didDrawPage: (data) => {
                // Header is already drawn for first page, but for subsequent pages?
                // autoTable handles page breaks. We might need to re-draw header/footer hook.
            }
        });

    } else if (type === 'daily') {
        const tableColumn = ["Time", "Device / Type", "Location", "Installer", "Status"];
        const tableRows = [];

        // Installations
        data.dailyInstalls.forEach(install => {
            const time = new Date(install.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            tableRows.push([
                time,
                install.deviceType?.toUpperCase(),
                install.locationId || install.location || '-',
                install.createdBy || install.installer || '-',
                'INSTALLED'
            ]);
        });

        // Issues
        data.dailyIssues.forEach(issue => {
            const time = new Date(issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            tableRows.push([
                time,
                "ISSUE",
                issue.location || '-',
                issue.reportingUser || issue.reportedBy || '-',
                issue.status.toUpperCase()
            ]);
        });

        if (tableRows.length === 0) {
            doc.text("No activity recorded for today.", margin, startY + 10);
        } else {
            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: startY,
                theme: 'striped',
                headStyles: { fillColor: [0, 0, 0], textColor: [234, 179, 8] },
                styles: { fontSize: 9 },
            });
        }
    }

    // Add Footer to all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        addHeader(); // Re-add header to ensure it's on all pages or just first? Usually just first for big header. 
        // Let's keep big header only on first, simple footer on all.
        addFooter(i, pageCount);
    }

    doc.save(`${project.name.replace(/\s+/g, '_')}_${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};
