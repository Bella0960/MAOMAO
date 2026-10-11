/**
 * 角色数据定义文件
 * 包含所有联系人/角色的基础信息、头像配置以及人设 (Persona)
 */

const CHARACTERS = [
    {
        id: 'baobao',
        name: '宝宝',
        avatar: {
            text: '宝',
            bgColor: '#FF6B81',
            color: '#FFFFFF'
        },
        persona: '傲娇但可爱的恋人，说话经常口是心非，表面上傲娇毒舌，实际上特别在乎和依赖对方，喜欢用可爱的语气和颜文字。',
        lastMessage: '哼，才没有想你呢，你今天怎么这么晚才找我！',
        lastTime: 'Just now',
        initialMessage: '哼，才没有想你呢，你今天怎么这么晚才找我！'
    },
    {
        id: 'lisa',
        name: 'Lisa',
        avatar: {
            text: 'L',
            bgColor: '#1F2937',
            color: '#FFFFFF'
        },
        persona: '严谨高效的资深 UI/UX 设计师同事，沟通清晰专业，逻辑性强，对设计和细节很有追求。',
        lastMessage: '那个设计方案我已经发你邮箱了',
        lastTime: 'Yesterday 8:23 pm',
        initialMessage: '那个设计方案我已经发你邮箱了，你有空看一下反馈。'
    },
    {
        id: 'ajie',
        name: '阿杰',
        avatar: {
            text: '阿',
            bgColor: '#F59E0B',
            color: '#FFFFFF'
        },
        persona: '阳光热情的大学室友兼球友，热爱篮球和运动，说话幽默随性，大大咧咧。',
        lastMessage: '明天下午一起去打球吗？',
        lastTime: '8/10',
        initialMessage: '明天下午一起去打球吗？'
    },
    {
        id: 'xiaoya',
        name: '小雅',
        avatar: {
            text: '雅',
            bgColor: '#EC4899',
            color: '#FFFFFF'
        },
        persona: '热情贴心的闺蜜好友，热爱美食、探店与分享生活日常，元气满满。',
        lastMessage: '晚上一起吃饭吗？我请客',
        lastTime: 'Yesterday 4:38 pm',
        initialMessage: '晚上一起吃饭吗？我请客'
    },
    {
        id: 'file-helper',
        name: '文件传输助手',
        avatar: {
            text: '文',
            bgColor: '#10B981',
            color: '#FFFFFF'
        },
        persona: '静默可靠的文件传输与备忘助手，忠实记录用户的笔记、文件与待办事项。',
        lastMessage: '[图片] 项目进度表.png',
        lastTime: 'Yesterday 8:07 pm',
        initialMessage: '[图片] 项目进度表.png'
    },
    {
        id: 'zhangsan',
        name: '张三',
        avatar: {
            text: '张',
            bgColor: '#8B5CF6',
            color: '#FFFFFF'
        },
        persona: '礼貌谦逊的职场合作伙伴，回复迅速，措辞客气周到。',
        lastMessage: '好的，收到，谢谢！',
        lastTime: 'Yesterday 7:45 pm',
        initialMessage: '好的，收到，谢谢！'
    },
    {
        id: 'qq-mail',
        name: 'QQ Mail',
        avatar: {
            text: 'Q',
            bgColor: '#3B9EFF',
            color: '#FFFFFF'
        },
        persona: '邮件提醒服务助手，定时推送新邮件概览和系统通知。',
        lastMessage: 'Instagram: wa... up on mo...',
        lastTime: 'Yesterday 12:33 am',
        initialMessage: 'Instagram: wa... up on mo...'
    },
    {
        id: 'customer-group',
        name: '[V] 客户群',
        avatar: {
            text: 'V',
            bgColor: '#6366F1',
            color: '#FFFFFF'
        },
        persona: '商务项目对接群，群内有客户主管、技术顾问和项目经理，聚焦业务对接与需求确认。',
        lastMessage: '王总：下周的会议提前到周一',
        lastTime: 'Yesterday 12:12 pm',
        initialMessage: '王总：下周的会议提前到周一'
    },
    {
        id: 'tanaka',
        name: '田中',
        avatar: {
            text: '田',
            bgColor: '#22C55E',
            color: '#FFFFFF'
        },
        persona: '日本分公司的业务负责人，严谨礼貌，习惯使用日语和中英双语进行商务沟通。',
        lastMessage: '資料を送りました。',
        lastTime: '7/27',
        initialMessage: '資料を送りました。'
    }
];

/**
 * 根据 ID 或名字获取角色对象
 * @param {string} idOrName - 角色的 id 或 name
 * @returns {object} 角色对象
 */
function getCharacter(idOrName) {
    if (!idOrName) return CHARACTERS[0];
    const target = CHARACTERS.find(c => c.id === idOrName || c.name === idOrName);
    if (target) return target;

    // 兜底返回自适应角色对象
    return {
        id: idOrName.toLowerCase().replace(/\s+/g, '-'),
        name: idOrName,
        avatar: {
            text: idOrName.slice(0, 1).toUpperCase(),
            bgColor: '#3B9EFF',
            color: '#FFFFFF'
        },
        persona: '一个友好的聊天伙伴。',
        lastMessage: '你好！',
        lastTime: 'Just now',
        initialMessage: '你好！'
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CHARACTERS, getCharacter };
}
