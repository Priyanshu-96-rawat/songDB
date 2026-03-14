import { useRef, useEffect } from "react";

export function useDraggableScroll() {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const slider = ref.current;
        if (!slider) return;

        let isDown = false;
        let startX: number;
        let scrollLeft: number;
        let isDragging = false;

        const mouseDown = (e: MouseEvent) => {
            isDown = true;
            isDragging = false;
            slider.style.cursor = 'grabbing';
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        };

        const mouseLeave = () => {
            isDown = false;
            slider.style.cursor = '';
        };

        const mouseUp = () => {
            isDown = false;
            slider.style.cursor = '';
        };

        const mouseMove = (e: MouseEvent) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2; // Scroll speed multiplier
            
            if (Math.abs(walk) > 5) {
                isDragging = true; // User actually moved, flag as dragging
            }
            slider.scrollLeft = scrollLeft - walk;
        };

        // Suppress clicks on children if we were dragging
        const captureClick = (e: MouseEvent) => {
            if (isDragging) {
                e.stopPropagation();
                e.preventDefault();
            }
        };

        // Prevent native image drag
        const preventNativeDrag = (e: DragEvent) => {
            e.preventDefault();
        };

        slider.addEventListener('mousedown', mouseDown);
        slider.addEventListener('mouseleave', mouseLeave);
        slider.addEventListener('mouseup', mouseUp);
        slider.addEventListener('mousemove', mouseMove);
        slider.addEventListener('click', captureClick, { capture: true });
        slider.addEventListener('dragstart', preventNativeDrag);

        return () => {
            slider.removeEventListener('mousedown', mouseDown);
            slider.removeEventListener('mouseleave', mouseLeave);
            slider.removeEventListener('mouseup', mouseUp);
            slider.removeEventListener('mousemove', mouseMove);
            slider.removeEventListener('click', captureClick, { capture: true });
            slider.removeEventListener('dragstart', preventNativeDrag);
        };
    }, []);

    return ref;
}
