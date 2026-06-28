// TIM v2.1
// Tab Controller

document.addEventListener("DOMContentLoaded", () => {

    const tabs = document.querySelectorAll(".tab");
    const pages = document.querySelectorAll(".page");

    function showTab(tabName){

        pages.forEach(page=>{
            page.classList.add("hidden");
        });

        tabs.forEach(tab=>{
            tab.classList.remove("active");
        });

        const targetPage =
            document.getElementById(tabName + "Tab");

        if(targetPage){
            targetPage.classList.remove("hidden");
        }

        const targetButton =
            document.querySelector(`[data-tab="${tabName}"]`);

        if(targetButton){
            targetButton.classList.add("active");
        }

    }

    tabs.forEach(tab=>{

        tab.addEventListener("click",()=>{

            const tabName =
                tab.dataset.tab;

            showTab(tabName);

        });

    });

    showTab("dashboard");

});