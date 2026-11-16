
/* ==========================================
   미니 이모티콘 연결 테스트
   script.js
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // 1. 기본 설정
    // ==========================================

    const MAX_IMAGES = 42;

    const COLS = 6;
    const ROWS = 7;

    const TOTAL_CELLS = COLS * ROWS;

    const GRID_CELL_SIZE = 90;
    const CHAT_IMAGE_SIZE = 19;

    // HTML 요소
    const imageUpload = document.getElementById("imageUpload");
    const dropZone = document.getElementById("dropZone");

    const imageCount = document.getElementById("imageCount");

    const gridPreview = document.getElementById("gridPreview");
    const chatPreview = document.getElementById("chatPreview");

    const resetButton = document.getElementById("resetButton");

    const backgroundButtons = document.querySelectorAll(
        ".background-option"
    );

    // 이미지 데이터
    let uploadedImages = [];

    // 42개 프레임의 배치 정보
    let gridSlots = Array(TOTAL_CELLS).fill(null);

    // 이미지 고유 ID
    let nextImageId = 1;

    // 드래그 중인 이미지
    let draggedItem = null;

    // WEBP 반복 재생 타이머
    const webpReplayTimers = new Map();


    // ==========================================
    // 2. WEBP 애니메이션 반복 재생
    // ==========================================

    function restartWebPAnimation(img, image) {

        // 기존 타이머 제거
        if (webpReplayTimers.has(image.id)) {

            clearInterval(webpReplayTimers.get(image.id));

            webpReplayTimers.delete(image.id);

        }

        if (image.type !== "image/webp") {
            return;
        }

        let replayCount = 0;

        const timer = setInterval(() => {

            // 이미지가 화면에서 제거된 경우
            if (!img.isConnected) {

                clearInterval(timer);

                webpReplayTimers.delete(image.id);

                return;

            }

            // 최초 재생 이후 2회 더 재시작
            if (replayCount >= 2) {

                clearInterval(timer);

                webpReplayTimers.delete(image.id);

                return;

            }

            // 애니메이션 재시작
            img.src = "";

            requestAnimationFrame(() => {

                if (img.isConnected) {

                    img.src = image.url;

                }

            });

            replayCount++;

        }, 3000);

        webpReplayTimers.set(image.id, timer);

    }


    // ==========================================
    // 3. 배경색 설정
    // ==========================================

    function changeBackground(color) {

        const cells = gridPreview.querySelectorAll(".grid-cell");

        cells.forEach(cell => {

            if (color === "transparent") {

                // 투명 격자무늬
                cell.style.backgroundColor = "#fff";

                cell.style.backgroundImage = `
                    linear-gradient(45deg, #e5e5e5 25%, transparent 25%),
                    linear-gradient(-45deg, #e5e5e5 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #e5e5e5 75%),
                    linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)
                `;

                cell.style.backgroundSize = "12px 12px";

                cell.style.backgroundPosition = `
                    0 0,
                    0 6px,
                    6px -6px,
                    -6px 0
                `;

            } else {

                // 선택한 색상
                cell.style.backgroundColor = color;

                cell.style.backgroundImage = "none";

            }

        });

        // 선택 버튼 표시
        backgroundButtons.forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.background === color
            );

        });

    }


    // 배경색 버튼 이벤트
    backgroundButtons.forEach(button => {

        button.addEventListener("click", () => {

            changeBackground(button.dataset.background);

        });

    });


    // ==========================================
    // 4. 6 × 7 프레임 생성
    // ==========================================

    function createGrid() {

        gridPreview.innerHTML = "";

        gridPreview.style.display = "grid";

        gridPreview.style.gridTemplateColumns =
            `repeat(${COLS}, ${GRID_CELL_SIZE}px)`;

        gridPreview.style.gridTemplateRows =
            `repeat(${ROWS}, ${GRID_CELL_SIZE}px)`;

        gridPreview.style.width =
            `${COLS * GRID_CELL_SIZE}px`;

        gridPreview.style.height =
            `${ROWS * GRID_CELL_SIZE}px`;

        for (let i = 0; i < TOTAL_CELLS; i++) {

            const cell = document.createElement("div");

            cell.className = "grid-cell";

            cell.dataset.index = i;

            cell.draggable = true;

            // 드래그 시작
            cell.addEventListener("dragstart", (e) => {

                handleGridDragStart(e, i);

            });

            // 드래그 진입
            cell.addEventListener("dragover", (e) => {

                e.preventDefault();

                cell.classList.add("drag-over");

            });

            // 드래그 이탈
            cell.addEventListener("dragleave", () => {

                cell.classList.remove("drag-over");

            });

            // 드롭
            cell.addEventListener("drop", (e) => {

                handleGridDrop(e, i);

            });

            // 드래그 종료
            cell.addEventListener("dragend", () => {

                draggedItem = null;

                clearDragStyles();

            });

            gridPreview.appendChild(cell);

        }

        changeBackground("transparent");

        renderGrid();

    }


    // ==========================================
    // 5. 이미지 업로드
    // ==========================================

    function handleFiles(files) {

        const validFiles = Array.from(files).filter(file => {

            return (
                file.type === "image/png" ||
                file.type === "image/webp"
            );

        });

        if (validFiles.length === 0) {

            alert("PNG 또는 WEBP 파일만 업로드할 수 있습니다.");

            return;

        }

        for (const file of validFiles) {

            if (uploadedImages.length >= MAX_IMAGES) {

                alert("이미지는 최대 42개까지 업로드할 수 있습니다.");

                break;

            }

            const imageData = {

                id: nextImageId++,

                name: file.name,

                url: URL.createObjectURL(file),

                type: file.type

            };

            uploadedImages.push(imageData);

            // 첫 번째 빈 프레임 찾기
            const emptyIndex = gridSlots.findIndex(
                slot => slot === null
            );

            // 자동 배치
            if (emptyIndex !== -1) {

                gridSlots[emptyIndex] = imageData.id;

            }

        }

        updateImageCount();

        renderGrid();

    }


    // ==========================================
    // 6. 파일 선택 이벤트
    // ==========================================

    imageUpload.addEventListener("change", (e) => {

        handleFiles(e.target.files);

        imageUpload.value = "";

    });


    // ==========================================
    // 7. 드래그 앤 드롭 업로드
    // ==========================================

    dropZone.addEventListener("dragover", (e) => {

        e.preventDefault();

        dropZone.classList.add("drag-over");

    });


    dropZone.addEventListener("dragleave", (e) => {

        if (!dropZone.contains(e.relatedTarget)) {

            dropZone.classList.remove("drag-over");

        }

    });


    dropZone.addEventListener("drop", (e) => {

        e.preventDefault();

        dropZone.classList.remove("drag-over");

        handleFiles(e.dataTransfer.files);

    });


    // 브라우저 기본 파일 열기 방지
    document.addEventListener("dragover", (e) => {

        if (Array.from(e.dataTransfer.types).includes("Files")) {

            e.preventDefault();

        }

    });


    document.addEventListener("drop", (e) => {

        if (Array.from(e.dataTransfer.types).includes("Files")) {

            e.preventDefault();

        }

    });


    // ==========================================
    // 8. 업로드 개수 표시
    // ==========================================

    function updateImageCount() {

        imageCount.textContent =
            `${uploadedImages.length} / ${MAX_IMAGES}`;

    }


    // ==========================================
    // 9. 연결 테스트 프레임 표시
    // ==========================================

    function renderGrid() {

        const cells = gridPreview.querySelectorAll(".grid-cell");

        cells.forEach((cell, index) => {

            cell.innerHTML = "";

            cell.classList.remove("has-image");

            const imageId = gridSlots[index];

            if (imageId === null) {

                return;

            }

            const image = uploadedImages.find(
                item => item.id === imageId
            );

            if (!image) {

                gridSlots[index] = null;

                return;

            }

            const img = document.createElement("img");

            img.src = image.url;

            img.alt = image.name;

            img.draggable = false;

            // 프레임을 이미지가 최대한 채우도록 설정
            img.style.width = "100%";

            img.style.height = "100%";

            img.style.objectFit = "contain";

            cell.appendChild(img);

            cell.classList.add("has-image");

            // WEBP 애니메이션 반복 재생
            restartWebPAnimation(img, image);

        });

        renderChat();

    }


    // ==========================================
    // 10. 프레임 드래그 시작
    // ==========================================

    function handleGridDragStart(e, index) {

        const imageId = gridSlots[index];

        if (imageId === null) {

            e.preventDefault();

            return;

        }

        draggedItem = {

            type: "grid",

            id: imageId,

            index: index

        };

        e.dataTransfer.setData(
            "text/plain",
            String(imageId)
        );

        e.dataTransfer.effectAllowed = "move";

    }


    // ==========================================
    // 11. 프레임 내부 이미지 이동 및 교환
    // ==========================================

    function handleGridDrop(e, targetIndex) {

        e.preventDefault();

        e.currentTarget.classList.remove("drag-over");

        if (!draggedItem) {

            return;

        }

        const targetImageId = gridSlots[targetIndex];

        // 업로드 목록에서 프레임으로 이동하는 경우
        if (draggedItem.type === "upload") {

            const imageId = draggedItem.id;

            const previousIndex = gridSlots.indexOf(imageId);

            if (previousIndex !== -1) {

                if (previousIndex === targetIndex) {

                    draggedItem = null;

                    return;

                }

                gridSlots[previousIndex] = targetImageId;

            }

            gridSlots[targetIndex] = imageId;

        }

        // 프레임 안에서 이미지 이동
        else if (draggedItem.type === "grid") {

            const sourceIndex = draggedItem.index;

            if (sourceIndex === targetIndex) {

                draggedItem = null;

                return;

            }

            // 두 이미지의 위치 교환
            gridSlots[sourceIndex] = targetImageId;

            gridSlots[targetIndex] = draggedItem.id;

        }

        draggedItem = null;

        renderGrid();

    }


    // ==========================================
    // 12. 채팅창 미리보기
    // ==========================================

    function renderChat() {

        chatPreview.innerHTML = "";

        chatPreview.style.display = "grid";

        chatPreview.style.gridTemplateColumns =
            `repeat(${COLS}, ${CHAT_IMAGE_SIZE}px)`;

        chatPreview.style.gridTemplateRows =
            `repeat(${ROWS}, ${CHAT_IMAGE_SIZE}px)`;

        chatPreview.style.gridAutoRows =
            `${CHAT_IMAGE_SIZE}px`;

        chatPreview.style.gap = "0";

        for (let i = 0; i < TOTAL_CELLS; i++) {

            const cell = document.createElement("div");

            cell.className = "chat-cell";

            const imageId = gridSlots[i];

            if (imageId !== null) {

                const image = uploadedImages.find(
                    item => item.id === imageId
                );

                if (image) {

                    const img = document.createElement("img");

                    img.src = image.url;

                    img.alt = image.name;

                    img.draggable = false;

                    img.style.width =
                        `${CHAT_IMAGE_SIZE}px`;

                    img.style.height =
                        `${CHAT_IMAGE_SIZE}px`;

                    img.style.objectFit = "contain";

                    cell.appendChild(img);

                }

            }

            chatPreview.appendChild(cell);

        }

    }


    // ==========================================
    // 13. 드래그 스타일 초기화
    // ==========================================

    function clearDragStyles() {

        document.querySelectorAll(".dragging").forEach(item => {

            item.classList.remove("dragging");

        });

        document.querySelectorAll(".drag-over").forEach(item => {

            item.classList.remove("drag-over");

        });

    }


    // ==========================================
    // 14. 전체 초기화
    // ==========================================

    resetButton.addEventListener("click", () => {

        const confirmed = confirm(
            "업로드한 이미지와 모든 배치를 초기화할까요?"
        );

        if (!confirmed) {

            return;

        }

        // 모든 WEBP 타이머 종료
        webpReplayTimers.forEach(timer => {

            clearInterval(timer);

        });

        webpReplayTimers.clear();

        // 이미지 URL 해제
        uploadedImages.forEach(image => {

            URL.revokeObjectURL(image.url);

        });

        uploadedImages = [];

        gridSlots = Array(TOTAL_CELLS).fill(null);

        nextImageId = 1;

        draggedItem = null;

        imageUpload.value = "";

        updateImageCount();

        renderGrid();

        renderChat();

        // 배경 투명으로 복귀
        changeBackground("transparent");

    });


    // ==========================================
    // 15. 최초 실행
    // ==========================================

    createGrid();

    updateImageCount();

    renderChat();

});
