const _state = {
    activeContainer: null
};

const rotatePage = e => {
    if(e.target.textContent === '↺') {
        document.body.style.flexDirection = 'column';
        e.target.textContent = '⟳';
        const togglers = document.getElementById('togglers');
        togglers.style.transform = 'rotate(180deg)';
        togglers.style.writingMode = 'vertical-lr';
        togglers.style.height = 'auto';
        togglers.style.width = '100vw';
        for(const toggler of togglers.querySelectorAll('div'))
            toggler.classList.add('horizontal');
        const rec = document.querySelector('.record.thin');
        if(rec) rec.className = 'record fat';
    }
    else {
        document.body.style.flexDirection = 'row-reverse';
        e.target.textContent = '↺';
        const togglers = document.getElementById('togglers');
        togglers.style.transform = 'unset';
        togglers.style.writingMode = 'unset';
        togglers.style.height = '100vh';
        togglers.style.width = 'auto';
        for(const toggler of togglers.querySelectorAll('div'))
            toggler.classList.remove('horizontal');
        const rec = document.querySelector('.record.fat');
        if(rec) rec.className = 'record thin';
    }
};

const getVisibleContainer = () => {
    if(_state.activeContainer) return _state.activeContainer;

    const conts = document.querySelectorAll('.recordcontainer');
    for(const cont of conts)
        if(cont.style.display !== 'none') return cont;

    return document.getElementById('recordcontainer');
};

const hideViewer = () => {
    const viewer = document.getElementById('viewer');
    viewer.style.display = 'none';
    //_state.curImage = TSTViewer.getMiradorCanvasId(_state.mirador);
    //TSTViewer.killMirador();
    const toggle = document.getElementById('viewertoggle');
    const othertoggle = document.getElementById('recordtoggle');
    const rotator = document.getElementById('rotator');
    toggle.textContent = '>';
    toggle.title = 'show images';
    othertoggle.style.display = 'none';
    rotator.style.display = 'none';
    const rec = document.querySelector('.record.thin');
    if(rec) rec.className = 'record fat';
    //TSTViewer.refreshMirador();   
};

const showViewer = () => {
    const viewer = document.getElementById('viewer');
    viewer.style.display = 'block';
    //TSTViewer.refreshMirador(_state.mirador,_state.manifest, _state.curImage);
    const toggle = document.getElementById('viewertoggle');
    const othertoggle = document.getElementById('recordtoggle');
    const rotator = document.getElementById('rotator');
    toggle.textContent = '<';
    toggle.title = 'hide images';
    toggle.style.display = 'flex';
    othertoggle.title = 'hide text';
    othertoggle.style.display = 'flex';
    rotator.style.display = 'flex';
    if(document.body.style.flexDirection === 'row-reverse') {
        const rec = document.querySelector('.record.fat');
        if(rec) rec.className = 'record thin';
    }
};

const hideRecord = () => {
    _state.activeContainer = getVisibleContainer();
    _state.activeContainer.style.display = 'none';
    const toggle = document.getElementById('recordtoggle');
    const othertoggle = document.getElementById('viewertoggle');
    const rotator = document.getElementById('rotator');
    toggle.textContent = '<';
    toggle.title = 'show text';
    othertoggle.style.display = 'none';
    rotator.style.display = 'none';
    //TSTViewer.refreshMirador(_state.mirador,_state.manifest, _state.curImage);
};

const showRecord = () => {
    (getVisibleContainer()).style.display = 'flex';
    const toggle = document.getElementById('recordtoggle');
    const othertoggle = document.getElementById('viewertoggle');
    const rotator = document.getElementById('rotator');
    toggle.textContent = '>';
    toggle.title = 'hide text';
    othertoggle.style.display = 'flex';
    rotator.style.display = 'flex';
    //TSTViewer.refreshMirador(_state.mirador,_state.manifest, _state.curImage);
};

const toggleViewer = e => { 
    if(e.target.textContent === '<') 
        hideViewer(); 
    else 
        showViewer(); 
};  
    
const toggleRecord = e => { 
    if(e.target.textContent === '>') 
        hideRecord(); 
    else 
        showRecord(); 
};  

const toggleClick = e => {
    if(e.target.closest('#viewertoggle'))
        toggleViewer(e);
    else if(e.target.closest('#recordtoggle'))
        toggleRecord(e);
    else if(e.target.closest('#rotator'))
        rotatePage(e);

};

document.getElementById('togglers').addEventListener('click',toggleClick);
