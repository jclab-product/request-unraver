/*
 * Copyright 2024 JC-Lab (joseph@jc-lab.net)
 *
 * COMMERCIAL LICENSE.
 * For use only by licensed user/company.
 */

window.HTMLFormElement.prototype.submit = function () {
    const $form = $(this);
    const unindexedArray = $form.serializeArray();
    const data = {};

    const action = $form.attr('action');
    const method = $form.attr('method');
    $.map(unindexedArray, function (n, i) {
        data[n['name']] = n['value'];
    });

    __sys_form_submit(JSON.stringify({
        action: action,
        method: method,
        data: data,
    }));
}
