// 流水录入页面逻辑

// 页面状态
let isFormSubmitting = false;

/**
 * 页面初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    setupEventListeners();
    setupRealTimeCalculation();
});

/**
 * 初始化表单
 */
function initializeForm() {
    // 设置默认日期为今天
    const eventDateInput = document.getElementById('eventDate');
    if (eventDateInput && !eventDateInput.value) {
        const today = new Date();
        eventDateInput.value = formatDate(today, 'YYYY-MM-DD');
    }
    
    // 设置默认奖牌单价
    const medalPriceInput = document.getElementById('medalPrice');
    if (medalPriceInput && !medalPriceInput.value) {
        medalPriceInput.value = '18';
    }
    
    // 初始计算预览
    updateCalculationPreview();
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 表单提交
    const form = document.getElementById('tournamentForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // 重置表单按钮
    const resetBtn = document.getElementById('resetForm');
    if (resetBtn) {
        resetBtn.addEventListener('click', handleFormReset);
    }
    
    // 成功模态框中的继续录入按钮
    const continueBtn = document.getElementById('continueInput');
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            closeSuccessModal();
            handleFormReset();
        });
    }
    
    // 模态框关闭事件
    setupModalEvents();
}

/**
 * 设置实时计算
 */
function setupRealTimeCalculation() {
    // 监听所有影响计算的输入字段
    const inputs = [
        'participantCount',
        'totalRevenue',
        'medalCount',
        'medalPrice',
        'tournamentType',
        'isCertified'
    ];
    
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', debounce(updateCalculationPreview, 300));
            input.addEventListener('change', updateCalculationPreview);
        }
    });
}

/**
 * 更新计算预览
 */
function updateCalculationPreview() {
    const formData = getFormData();
    const calculated = calculateFees(formData);
    
    // 更新预览值
    updatePreviewValues(calculated);
    
    // 更新计算说明
    updateCalculationExplanation(formData, calculated);
}

/**
 * 获取表单数据
 */
function getFormData() {
    return {
        tournamentName: getValue('tournamentName'),
        eventDate: getValue('eventDate'),
        participantCount: getNumberValue('participantCount'),
        withdrawalCount: getNumberValue('withdrawalCount'),
        totalRevenue: getNumberValue('totalRevenue'),
        wechatPayment: getNumberValue('wechatPayment'),
        refundBalance: getNumberValue('refundBalance'),
        medalCount: getNumberValue('medalCount'),
        medalPrice: getNumberValue('medalPrice'),
        tournamentType: getValue('tournamentType'),
        isCertified: document.getElementById('isCertified')?.checked || false
    };
}

/**
 * 获取输入值
 */
function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
}

/**
 * 获取数字输入值
 */
function getNumberValue(id) {
    const value = getValue(id);
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

/**
 * 更新预览值显示
 */
function updatePreviewValues(calculated) {
    const previewElements = {
        'previewProcessingFee': calculated.processingFee,
        'previewWechatFee': calculated.wechatFee,
        'previewCertificationFee': calculated.certificationFee,
        'previewTotalFee': calculated.totalFee,
        'previewMedalCost': calculated.medalCost,
        'previewHostSettlement': calculated.hostSettlement,
        'previewTotalIncome': calculated.totalIncome
    };
    
    Object.entries(previewElements).forEach(([elementId, value]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = formatCurrency(value);
        }
    });
}

/**
 * 更新计算说明
 */
function updateCalculationExplanation(formData, calculated) {
    const explanationElement = document.getElementById('explanationContent');
    if (!explanationElement) return;
    
    const { tournamentType, totalRevenue, participantCount, isCertified, medalCount, medalPrice } = formData;
    
    if (!tournamentType || totalRevenue <= 0) {
        explanationElement.innerHTML = '<p>请填写基本信息以查看计算结果</p>';
        return;
    }
    
    let explanation = '<div class="calculation-steps">';
    
    // 手续费计算说明
    if (tournamentType === '协会机构' || tournamentType === '高校联赛') {
        explanation += `<p><strong>手续费：</strong>${formatCurrency(totalRevenue)} × 1.08% = ${formatCurrency(calculated.processingFee)}</p>`;
    } else if (tournamentType === '高校校园赛') {
        explanation += `<p><strong>手续费：</strong>${formatCurrency(totalRevenue)} × 0.4% = ${formatCurrency(calculated.processingFee)}</p>`;
    }
    
    // 微信手续费说明
    explanation += `<p><strong>微信手续费：</strong>${formatCurrency(totalRevenue)} × 0.6% = ${formatCurrency(calculated.wechatFee)}</p>`;
    
    // 认证费说明
    if (tournamentType === '协会机构' && isCertified) {
        explanation += `<p><strong>认证费：</strong>${participantCount}人 × ¥1 = ${formatCurrency(calculated.certificationFee)}</p>`;
    } else {
        explanation += `<p><strong>认证费：</strong>不收取认证费</p>`;
    }
    
    // 总手续费说明
    const originalTotal = calculated.processingFee + calculated.wechatFee + calculated.certificationFee;
    if (tournamentType === '协会机构' && originalTotal < 100) {
        explanation += `<p><strong>总手续费：</strong>${formatCurrency(originalTotal)} → ${formatCurrency(calculated.totalFee)}（协会机构最低收费¥100）</p>`;
    } else {
        explanation += `<p><strong>总手续费：</strong>${formatCurrency(calculated.processingFee)} + ${formatCurrency(calculated.wechatFee)} + ${formatCurrency(calculated.certificationFee)} = ${formatCurrency(calculated.totalFee)}</p>`;
    }
    
    // 奖牌费用说明
    explanation += `<p><strong>奖牌费用：</strong>${medalCount}个 × ${formatCurrency(medalPrice)} = ${formatCurrency(calculated.medalCost)}</p>`;
    
    // 主办结算说明
    explanation += `<p><strong>主办结算：</strong>${formatCurrency(totalRevenue)} - ${formatCurrency(calculated.totalFee)} - ${formatCurrency(calculated.medalCost)} = ${formatCurrency(calculated.hostSettlement)}</p>`;
    
    // 总收入说明
    explanation += `<p><strong>总收入：</strong>${formatCurrency(calculated.certificationFee)} + ${formatCurrency(calculated.processingFee)} = ${formatCurrency(calculated.totalIncome)}</p>`;
    
    explanation += '</div>';
    
    explanationElement.innerHTML = explanation;
}

/**
 * 处理表单提交
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (isFormSubmitting) {
        return;
    }
    
    try {
        isFormSubmitting = true;
        
        const formData = getFormData();
        
        // 验证表单数据
        const validation = validateTournamentData(formData);
        if (!validation.isValid) {
            showError(validation.errors.join('\n'));
            return;
        }
        
        // 提交数据
        const result = await API.Tournament.create(formData);
        
        if (result.success) {
            showSuccess('比赛数据录入成功！');
            showSuccessModal();
        } else {
            showError('录入失败：' + (result.error || '未知错误'));
        }
        
    } catch (error) {
        console.error('提交表单失败:', error);
        showError('录入失败，请稍后重试');
    } finally {
        isFormSubmitting = false;
    }
}

/**
 * 处理表单重置
 */
function handleFormReset() {
    const form = document.getElementById('tournamentForm');
    if (form) {
        form.reset();
        
        // 重新设置默认值
        initializeForm();
        
        // 更新计算预览
        updateCalculationPreview();
        
        showSuccess('表单已重置');
    }
}

/**
 * 显示成功模态框
 */
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'block';
        
        // 聚焦到继续录入按钮
        setTimeout(() => {
            const continueBtn = document.getElementById('continueInput');
            if (continueBtn) {
                continueBtn.focus();
            }
        }, 300);
    }
}

/**
 * 关闭成功模态框
 */
function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 设置模态框事件
 */
function setupModalEvents() {
    const modal = document.getElementById('successModal');
    if (!modal) return;
    
    // 点击模态框外部关闭
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeSuccessModal();
        }
    });
    
    // ESC键关闭
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            closeSuccessModal();
        }
    });
}

/**
 * 表单字段验证（实时）
 */
function setupFieldValidation() {
    const requiredFields = [
        'tournamentName',
        'eventDate',
        'participantCount',
        'withdrawalCount',
        'totalRevenue',
        'wechatPayment',
        'refundBalance',
        'medalCount',
        'medalPrice',
        'tournamentType'
    ];
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', () => validateField(field));
            field.addEventListener('input', () => clearFieldError(field));
        }
    });
}

/**
 * 验证单个字段
 */
function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.previousElementSibling?.textContent || field.name;
    
    // 清除之前的错误状态
    clearFieldError(field);
    
    // 检查必填字段
    if (field.hasAttribute('required') && !value) {
        showFieldError(field, `${fieldName}不能为空`);
        return false;
    }
    
    // 检查数字字段
    if (field.type === 'number') {
        const num = parseFloat(value);
        if (value && (isNaN(num) || num < 0)) {
            showFieldError(field, `${fieldName}必须是大于等于0的数字`);
            return false;
        }
    }
    
    return true;
}

/**
 * 显示字段错误
 */
function showFieldError(field, message) {
    field.style.borderColor = '#f56565';
    
    // 如果没有错误提示元素，创建一个
    let errorElement = field.parentNode.querySelector('.field-error');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.style.cssText = `
            color: #f56565;
            font-size: 0.85rem;
            margin-top: 0.25rem;
        `;
        field.parentNode.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
}

/**
 * 清除字段错误
 */
function clearFieldError(field) {
    field.style.borderColor = '';
    
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
}

/**
 * 自动保存表单数据到本地存储
 */
function setupAutoSave() {
    const form = document.getElementById('tournamentForm');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, select');
    
    // 加载保存的数据
    loadSavedFormData();
    
    // 监听输入变化
    inputs.forEach(input => {
        input.addEventListener('input', debounce(saveFormData, 1000));
    });
}

/**
 * 保存表单数据到本地存储
 */
function saveFormData() {
    try {
        const formData = getFormData();
        localStorage.setItem('tournamentFormData', JSON.stringify(formData));
    } catch (error) {
        console.error('保存表单数据失败:', error);
    }
}

/**
 * 从本地存储加载表单数据
 */
function loadSavedFormData() {
    try {
        const savedData = localStorage.getItem('tournamentFormData');
        if (savedData) {
            const formData = JSON.parse(savedData);
            
            // 询问用户是否恢复数据
            if (confirm('检测到未完成的表单数据，是否恢复？')) {
                Object.entries(formData).forEach(([key, value]) => {
                    const element = document.getElementById(key);
                    if (element) {
                        if (element.type === 'checkbox') {
                            element.checked = value;
                        } else {
                            element.value = value;
                        }
                    }
                });
                
                updateCalculationPreview();
            }
        }
    } catch (error) {
        console.error('加载保存的表单数据失败:', error);
    }
}

/**
 * 清除保存的表单数据
 */
function clearSavedFormData() {
    try {
        localStorage.removeItem('tournamentFormData');
    } catch (error) {
        console.error('清除保存的表单数据失败:', error);
    }
}

// 页面卸载时清除自动保存的数据（成功提交后）
window.addEventListener('beforeunload', () => {
    // 只在表单成功提交后清除
    if (document.getElementById('successModal')?.style.display === 'block') {
        clearSavedFormData();
    }
});

// 初始化字段验证和自动保存
document.addEventListener('DOMContentLoaded', () => {
    setupFieldValidation();
    setupAutoSave();
});

// 导出函数供其他模块使用
if (typeof window !== 'undefined') {
    window.InputForm = {
        updateCalculationPreview,
        getFormData,
        validateField,
        clearFieldError
    };
}
