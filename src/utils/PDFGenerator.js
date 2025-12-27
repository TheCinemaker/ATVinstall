import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: startY,
            theme: 'grid',
            headStyles: { fillColor: [0, 0, 0], textColor: [234, 179, 8] },
            styles: { fontSize: 10, cellPadding: 3 },
            alternateRowStyles: { fillColor: [245, 245, 245] }
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
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: startY,
                theme: 'striped',
                headStyles: { fillColor: [0, 0, 0], textColor: [234, 179, 8] },
                styles: { fontSize: 9 },
            });
        }
    }
    // --- DETAILED ISSUE HISTORY (Appended to Total Report) ---
    if (type === 'total' && data.issues && data.issues.length > 0) {
        // Add a page break or spacing
        let finalY = doc.lastAutoTable.finalY + 15;

        // If not enough space, new page
        if (finalY > pageHeight - 30) {
            doc.addPage();
            finalY = 20;
            addHeader();
            finalY = 50;
        }

        doc.setFontSize(14);
        doc.setTextColor(234, 179, 8); // Yellow
        doc.text("Issue History & Resolution Log", margin, finalY);

        const issueRows = data.issues.map(issue => {
            const isResolved = issue.status === 'resolved';

            // Format Report Info
            const reportDate = issue.createdAt ? new Date(issue.createdAt.seconds ? issue.createdAt.seconds * 1000 : issue.createdAt).toLocaleString() : 'N/A';
            const reporter = issue.createdBy || issue.reportedBy || 'Unknown';
            const desc = issue.description || issue.issueDescription || issue.notes || '-';

            const reportInfo = `Reported: ${reportDate}\nBy: ${reporter}\n\n${desc}`;

            // Format Resolution Info
            let resInfo = '-';
            if (isResolved) {
                const resDate = issue.resolvedAt ? new Date(issue.resolvedAt.seconds ? issue.resolvedAt.seconds * 1000 : issue.resolvedAt).toLocaleString() : 'N/A';
                const resolver = issue.resolvedBy || 'Unknown';
                const notes = issue.resolutionNotes || '-';
                resInfo = `Resolved: ${resDate}\nBy: ${resolver}\n\n${notes}`;
            }

            return [
                issue.status.toUpperCase(),
                issue.locationId || issue.location || 'General',
                reportInfo,
                resInfo
            ];
        });

        autoTable(doc, {
            head: [['Status', 'Location', 'Problem Report', 'Resolution Details']],
            body: issueRows,
            startY: finalY + 5,
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
            styles: { fontSize: 8, cellPadding: 4, valign: 'top' },
            columnStyles: {
                0: { cellWidth: 20, fontStyle: 'bold' }, // Status
                1: { cellWidth: 25 }, // Location
                2: { cellWidth: 'auto' }, // Report
                3: { cellWidth: 'auto' }  // Resolution
            },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            didParseCell: (data) => {
                // Colorize Status
                if (data.section === 'body' && data.column.index === 0) {
                    const status = data.cell.raw;
                    if (status === 'RESOLVED') {
                        data.cell.styles.textColor = [0, 150, 0]; // Green
                    } else {
                        data.cell.styles.textColor = [200, 0, 0]; // Red
                    }
                }
            }
        });
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
